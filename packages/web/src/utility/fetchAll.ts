import { apiCall, apiOff, apiOn } from './api';
import getElectron from './getElectron';
import resolveApi, { resolveApiHeaders } from './resolveApi';

export interface FetchAllCallbacks {
  /** Called with each page of rows as they arrive. */
  onPage(rows: object[]): void;
  /** Called once when all data has been received. */
  onFinished(): void;
  /** Called if an error occurs. */
  onError(message: string): void;
}

export interface FetchAllHandle {
  /** Signal the loader to stop fetching. */
  cancel(): void;
}

const STREAM_BATCH_SIZE = 1000;
const WEB_PAGE_SIZE = 5000;

/**
 * Fetches all rows from a JSONL source.
 *
 * Electron: uses paginated `jsldata/get-rows` via IPC (already fast).
 * Web: waits for source to finish, then streams the entire JSONL file in a
 *       single HTTP request via `jsldata/stream-rows`, parsing lines
 *       progressively with ReadableStream. Falls back to paginated reads
 *       with larger page sizes if streaming is unavailable.
 */
export function fetchAll(
  jslid: string,
  loadDataPage: (offset: number, limit: number) => Promise<any>,
  callbacks: FetchAllCallbacks,
  pageSize: number = 100
): FetchAllHandle {
  const isElectron = !!getElectron();

  if (isElectron) {
    return fetchAllPaginated(jslid, loadDataPage, callbacks, pageSize);
  } else {
    return fetchAllWeb(jslid, loadDataPage, callbacks);
  }
}

/**
 * Web strategy: listen to SSE stats for progress, once source is finished
 * stream the entire JSONL in one HTTP request.
 */
function fetchAllWeb(
  jslid: string,
  loadDataPage: (offset: number, limit: number) => Promise<any>,
  callbacks: FetchAllCallbacks
): FetchAllHandle {
  let cancelled = false;
  let streamStarted = false;
  let abortController: AbortController | null = null;
  let streamReader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  // Initialize cancelFn before registering the SSE handler to avoid TDZ errors
  // if an immediate stats event triggers fallbackToPaginated() before initialization.
  let cancelFn = () => {
    cancelled = true;
    if (streamReader) {
      streamReader.cancel().catch(() => {});
      streamReader = null;
    }
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    cleanup();
  };

  const handleStats = (stats: { rowCount: number; changeIndex: number; isFinished: boolean }) => {
    if (cancelled || streamStarted) return;

    // Report progress while source is still writing
    if (!stats.isFinished) {
      callbacks.onPage([]); // trigger UI update with count info
      return;
    }

    // Source finished — stream all rows at once
    streamStarted = true;
    startStream();
  };

  apiOn(`jsldata-stats-${jslid}`, handleStats);

  async function startStream() {
    abortController = new AbortController();
    try {
      const resp = await fetch(`${resolveApi()}/jsldata/stream-rows?jslid=${encodeURIComponent(jslid)}`, {
        method: 'GET',
        cache: 'no-cache',
        signal: abortController.signal,
        headers: {
          ...resolveApiHeaders(),
        },
      });

      if (!resp.body || resp.status === 404 || resp.status === 405) {
        // Streaming endpoint not available in this environment — fall back to paginated reads
        cleanup();
        fallbackToPaginated();
        return;
      }

      if (!resp.ok) {
        // Non-recoverable server error (e.g. 403 security rejection, 5xx) — surface it
        callbacks.onError(`HTTP ${resp.status}: ${resp.statusText}`);
        cleanup();
        return;
      }

      streamReader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let isFirstLine = true;
      let batch: any[] = [];

      while (!cancelled) {
        const { done, value } = await streamReader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (cancelled) break;
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (isFirstLine) {
            isFirstLine = false;
            // Check if first line is a header
            try {
              const parsed = JSON.parse(trimmed);
              if (parsed.__isStreamHeader) continue;
              // Not a header — it's a data row
              batch.push(parsed);
            } catch {
              continue;
            }
            continue;
          }
          try {
            batch.push(JSON.parse(trimmed));
          } catch {
            // skip malformed lines
          }
          if (batch.length >= STREAM_BATCH_SIZE) {
            if (cancelled) break;
            callbacks.onPage(batch);
            batch = [];
          }
        }
      }

      // Flush the decoder — any bytes held for multi-byte char completion are released
      const flushed = decoder.decode();
      if (flushed) buffer += flushed;

      // Process remaining buffer
      const remainingBuffer = buffer.trim();
      if (remainingBuffer && !cancelled) {
        try {
          const parsed = JSON.parse(remainingBuffer);
          if (!parsed.__isStreamHeader) {
            batch.push(parsed);
          }
        } catch {
          // ignore
        }
      }

      if (batch.length > 0 && !cancelled) {
        callbacks.onPage(batch);
      }

      if (!cancelled) {
        callbacks.onFinished();
      }
    } catch (err) {
      if (!cancelled) {
        callbacks.onError(err?.message ?? String(err));
      }
    } finally {
      streamReader = null;
      abortController = null;
      cleanup();
    }
  }

  function fallbackToPaginated() {
    const handle = fetchAllPaginated(jslid, loadDataPage, callbacks, WEB_PAGE_SIZE);
    cancelFn = handle.cancel;
  }

  function cleanup() {
    apiOff(`jsldata-stats-${jslid}`, handleStats);
  }

  // Check if data is already finished
  checkInitialState();

  async function checkInitialState() {
    try {
      const stats = await apiCall('jsldata/get-stats', { jslid });
      if (stats && stats.isFinished && stats.rowCount > 0) {
        streamStarted = true;
        startStream();
      } else if (stats && stats.isFinished && stats.rowCount === 0) {
        // Source finished with zero rows — no SSE event will follow, finish immediately
        cleanup();
        callbacks.onFinished();
      }
      // Source still writing or no stats yet — SSE events will trigger stream when done
    } catch {
      // Stats not available yet — SSE events will arrive
    }
  }

  return {
    cancel() {
      cancelFn();
    },
  };
}

/**
 * Paginated strategy (Electron / fallback): uses `jsldata/get-rows` with
 * SSE stats events to know when new data is available.
 */
function fetchAllPaginated(
  jslid: string,
  loadDataPage: (offset: number, limit: number) => Promise<any>,
  callbacks: FetchAllCallbacks,
  pageSize: number
): FetchAllHandle {
  let cancelled = false;
  let finished = false;
  let offset = 0;
  let isRunning = false;
  let isSourceFinished = false;
  let drainRequested = false;

  function finish() {
    if (finished) return;
    finished = true;
    callbacks.onFinished();
    cleanup();
  }

  const handleStats = (stats: { rowCount: number; changeIndex: number; isFinished: boolean }) => {
    isSourceFinished = stats.isFinished;
    if (stats.rowCount > offset) {
      scheduleDrain();
    } else if (stats.isFinished && stats.rowCount === offset) {
      finish();
    }
  };

  function scheduleDrain() {
    if (isRunning) {
      drainRequested = true;
      return;
    }
    drain();
  }

  apiOn(`jsldata-stats-${jslid}`, handleStats);

  async function drain() {
    if (isRunning || cancelled) return;
    isRunning = true;
    drainRequested = false;

    try {
      while (!cancelled) {
        const rows = await loadDataPage(offset, pageSize);
        if (cancelled) break;

        if (rows.errorMessage) {
          callbacks.onError(rows.errorMessage);
          cleanup();
          return;
        }

        if (rows.length > 0) {
          offset += rows.length;
          callbacks.onPage(rows);
        }

        if (rows.length < pageSize) {
          if (isSourceFinished) {
            finish();
            return;
          }
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 0));
      }
    } catch (err) {
      if (!cancelled) {
        const msg = err?.message ?? String(err);
        if (msg.includes('ENOENT')) {
          // File not ready yet
        } else {
          callbacks.onError(msg);
          cleanup();
        }
      }
    } finally {
      isRunning = false;
      if (drainRequested && !cancelled) {
        scheduleDrain();
      }
    }
  }

  function cleanup() {
    apiOff(`jsldata-stats-${jslid}`, handleStats);
  }

  checkInitialState();

  async function checkInitialState() {
    try {
      const stats = await apiCall('jsldata/get-stats', { jslid });
      if (stats) {
        isSourceFinished = stats.isFinished;
        if (stats.rowCount > 0) {
          scheduleDrain();
        } else if (stats.isFinished && !cancelled) {
          // rowCount === 0: source finished empty — no SSE event will follow
          finish();
        }
      }
    } catch {
      // Stats not available yet
    }
  }

  return {
    cancel() {
      cancelled = true;
      cleanup();
    },
  };
}
