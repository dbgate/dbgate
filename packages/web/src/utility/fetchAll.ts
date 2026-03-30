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
  let cancelled = false;
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
    try {
      const resp = await fetch(`${resolveApi()}/jsldata/stream-rows?jslid=${encodeURIComponent(jslid)}`, {
        method: 'GET',
        cache: 'no-cache',
        headers: {
          ...resolveApiHeaders(),
        },
      });

      if (!resp.ok || !resp.body) {
        // Fallback to paginated reads
        cleanup();
        fallbackToPaginated();
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let isFirstLine = true;
      let batch: any[] = [];

      while (!cancelled) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          if (isFirstLine) {
            isFirstLine = false;
            // Check if first line is a header
            try {
              const parsed = JSON.parse(line);
              if (parsed.__isStreamHeader) continue;
              // Not a header — it's a data row
              batch.push(parsed);
            } catch {
              continue;
            }
            continue;
          }
          try {
            batch.push(JSON.parse(line));
          } catch {
            // skip malformed lines
          }
          if (batch.length >= STREAM_BATCH_SIZE) {
            callbacks.onPage(batch);
            batch = [];
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim() && !cancelled) {
        try {
          const parsed = JSON.parse(buffer);
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

  let cancelFn = () => {
    cancelled = true;
    cleanup();
  };

  // Check if data is already finished
  checkInitialState();

  async function checkInitialState() {
    try {
      const stats = await apiCall('jsldata/get-stats', { jslid });
      if (stats && stats.isFinished && stats.rowCount > 0) {
        streamStarted = true;
        startStream();
      } else if (stats && !stats.isFinished && stats.rowCount > 0) {
        // Source still writing — SSE events will trigger stream when done
      }
      // If no stats yet, wait for SSE events
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
  let offset = 0;
  let isRunning = false;
  let isSourceFinished = false;
  let drainRequested = false;

  const handleStats = (stats: { rowCount: number; changeIndex: number; isFinished: boolean }) => {
    isSourceFinished = stats.isFinished;
    if (stats.rowCount > offset) {
      scheduleDrain();
    } else if (stats.isFinished && stats.rowCount === offset) {
      callbacks.onFinished();
      cleanup();
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
            callbacks.onFinished();
            cleanup();
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
