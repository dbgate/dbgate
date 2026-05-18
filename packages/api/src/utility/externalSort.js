const crypto = require('crypto');
const fs = require('fs');
const { pipeline } = require('stream');
const os = require('os');
const readline = require('readline');
const path = require('path');
const { getLogger, extractErrorLogData } = require('dbgate-tools');

const logger = getLogger('externalSort');

// Number of rows accumulated per sorted temp-chunk during external sort.
// Capped so that a single chunk never exceeds ~50 MB for typical row sizes.
const SORT_CHUNK_SIZE = 50_000;

// Maximum number of chunk files merged simultaneously in one pass.
// Limits the number of concurrently open file descriptors during merge.
const MAX_MERGE_FAN_IN = 16;

// Async generator that yields parsed JSON objects from an internally-generated
// sorted chunk file. Parse errors are thrown immediately — chunk files are
// always written by this module, so a parse error indicates corruption.
async function* readChunkLines(file) {
  const stream = fs.createReadStream(file);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  try {
    for await (const line of rl) {
      if (!line.trim()) continue;
      yield JSON.parse(line); // intentionally throws on bad JSON
    }
  } finally {
    rl.close();
    stream.destroy();
  }
}

// Cross-device-safe rename: tries renameSync first; on EXDEV (cross-filesystem)
// falls back to a streaming copy followed by unlinking the source.
// Uses stream.pipeline() so both streams are destroyed and the partial
// destination file is removed if an error occurs mid-copy.
async function safeRename(src, dest) {
  try {
    fs.renameSync(src, dest);
  } catch (e) {
    if (e.code !== 'EXDEV') throw e;
    await new Promise((resolve, reject) => {
      const rs = fs.createReadStream(src);
      const ws = fs.createWriteStream(dest);
      pipeline(rs, ws, err => {
        if (err) {
          try { fs.unlinkSync(dest); } catch { /* best-effort */ }
          reject(err);
        } else {
          resolve();
        }
      });
    });
    fs.unlinkSync(src);
  }
}

// Write an array of rows to a JSON-lines file, respecting stream backpressure.
function writeChunkFile(filePath, rows) {
  return new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(filePath);
    ws.on('error', reject);
    ws.on('finish', resolve);
    const writeNext = i => {
      for (; i < rows.length; i++) {
        const ok = ws.write(JSON.stringify(rows[i]) + '\n');
        if (!ok) {
          ws.once('drain', () => writeNext(i + 1));
          return;
        }
      }
      ws.end();
    };
    writeNext(0);
  });
}

// Min-heap used for k-way merge.  Each item stored in the heap is
// { row: object, iter: AsyncGenerator }.
class _SortMinHeap {
  constructor(comparator) {
    this._data = [];
    this._cmp = comparator;
  }
  get size() { return this._data.length; }
  push(item) {
    this._data.push(item);
    let i = this._data.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this._cmp(this._data[i].row, this._data[p].row) < 0) {
        [this._data[i], this._data[p]] = [this._data[p], this._data[i]];
        i = p;
      } else break;
    }
  }
  pop() {
    const top = this._data[0];
    const last = this._data.pop();
    if (this._data.length > 0) {
      this._data[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = 2 * i + 2, n = this._data.length;
        let min = i;
        if (l < n && this._cmp(this._data[l].row, this._data[min].row) < 0) min = l;
        if (r < n && this._cmp(this._data[r].row, this._data[min].row) < 0) min = r;
        if (min === i) break;
        [this._data[i], this._data[min]] = [this._data[min], this._data[i]];
        i = min;
      }
    }
    return top;
  }
}

// Merge exactly inputFiles.length (≤ MAX_MERGE_FAN_IN) sorted chunk files into
// one output file. Opens exactly inputFiles.length file descriptors at once.
async function mergeBatch(inputFiles, outfile, comparator) {
  const ws = fs.createWriteStream(outfile);
  const iters = inputFiles.map(f => readChunkLines(f));

  const cleanup = () => {
    ws.destroy();
    for (const it of iters) it.return();
  };

  try {
    await new Promise((resolve, reject) => {
      ws.on('error', err => { cleanup(); reject(err); });

      const heap = new _SortMinHeap(comparator);
      let settled = false;

      const fail = err => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(err);
      };

      const advance = async iter => {
        const { value, done } = await iter.next();
        if (!done) heap.push({ row: value, iter });
      };

      const drain = async () => {
        try {
          await Promise.all(iters.map(advance));

          while (heap.size > 0) {
            if (settled) return;
            const { row, iter } = heap.pop();
            const line = JSON.stringify(row) + '\n';
            const ok = ws.write(line);
            if (!ok) await new Promise(r => ws.once('drain', r));
            await advance(iter);
          }

          if (settled) return;
          ws.end();
          ws.once('finish', () => { settled = true; resolve(); });
        } catch (e) {
          fail(e);
        }
      };

      drain();
    });
  } catch (e) {
    // cleanup() was already called inside the Promise; re-throw so callers see the error.
    throw e;
  }
}

// Multi-pass k-way merge. Each pass merges groups of ≤ MAX_MERGE_FAN_IN files,
// writing intermediates via nextTmpFile() so they are tracked for cleanup.
// The very last pass writes directly to outfile (no cross-fs rename needed).
async function multiPassMerge(inputFiles, outfile, comparator, nextTmpFile) {
  let current = inputFiles;
  while (current.length > MAX_MERGE_FAN_IN) {
    const next = [];
    for (let i = 0; i < current.length; i += MAX_MERGE_FAN_IN) {
      const batch = current.slice(i, i + MAX_MERGE_FAN_IN);
      const merged = nextTmpFile();
      next.push(merged);
      await mergeBatch(batch, merged, comparator);
    }
    current = next;
  }
  await mergeBatch(current, outfile, comparator);
}

async function sortFile(infile, outfile, sort) {
  const comparator = (a, b) => {
    for (const { uniqueName, order } of sort) {
      const av = a[uniqueName], bv = b[uniqueName];
      if (av < bv) return order === 'ASC' ? -1 : 1;
      if (av > bv) return order === 'ASC' ? 1 : -1;
    }
    return 0;
  };

  const tmpDir = path.join(os.tmpdir(), `dbgate-sort-${crypto.randomUUID()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  // All tmp paths are registered here BEFORE any write attempt so that the
  // finally block can unlink partial files even when a write fails mid-way.
  const createdTmpFiles = new Set();
  let tmpCounter = 0;
  const nextTmpFile = () => {
    const f = path.join(tmpDir, `es-${tmpCounter++}.jsonl`);
    createdTmpFiles.add(f);
    return f;
  };

  try {
    // ── Phase 1: generate sorted runs ──────────────────────────────────────
    // Read the input line by line; accumulate SORT_CHUNK_SIZE rows, sort
    // them, write to a temp file, then discard the chunk from memory.
    // Peak memory ≈ one chunk (SORT_CHUNK_SIZE rows).
    //
    // The first non-empty line is inspected for __isStreamHeader. If found,
    // it is saved and excluded from sorting so it can be written back as the
    // very first line of the output file.
    let chunk = [];
    const runFiles = [];
    let headerRow = null;
    let isFirstNonEmptyLine = true;

    const flushChunk = async () => {
      if (chunk.length === 0) return;
      chunk.sort(comparator);
      // Register the path BEFORE writing so the finally block can always
      // clean it up even if writeChunkFile throws partway through.
      const tmpFile = nextTmpFile();
      runFiles.push(tmpFile);
      await writeChunkFile(tmpFile, chunk);
      chunk = [];
    };

    await new Promise((resolve, reject) => {
      const inputStream = fs.createReadStream(infile);
      const rl = readline.createInterface({ input: inputStream, crlfDelay: Infinity });
      let pendingFlush = Promise.resolve();
      let settled = false;

      const fail = err => {
        if (settled) return;
        settled = true;
        // Destroy both the readline interface and the underlying stream so
        // no file descriptors are leaked when we reject while paused.
        rl.close();
        inputStream.destroy();
        reject(err);
      };

      // Attach directly to the stream — readline.Interface does not reliably
      // forward the underlying stream's 'error' event.
      inputStream.on('error', fail);
      rl.on('error', fail);

      rl.on('line', line => {
        if (!line.trim()) return;
        let parsed;
        try {
          parsed = JSON.parse(line);
        } catch (e) {
          logger.warn(extractErrorLogData(e), 'DBGM-00000 Skipping invalid JSON line during sort');
          return;
        }
        // Detect and capture the stream header; do not include it in the sort.
        if (isFirstNonEmptyLine) {
          isFirstNonEmptyLine = false;
          if (parsed.__isStreamHeader) {
            headerRow = parsed;
            return;
          }
        }
        chunk.push(parsed);
        if (chunk.length >= SORT_CHUNK_SIZE) {
          rl.pause();
          pendingFlush = pendingFlush
            .then(() => flushChunk())
            .then(() => rl.resume())
            .catch(fail);
        }
      });

      rl.on('close', () => {
        if (settled) return;
        pendingFlush
          .then(() => flushChunk())
          .then(() => { settled = true; resolve(); })
          .catch(fail);
      });
    });

    // ── Phase 2: k-way streaming merge ─────────────────────────────────────
    if (headerRow !== null) {
      // There is a stream header that must appear as the first line of outfile.
      // Merge all data runs into a single intermediate file (or use the single
      // run directly), then write outfile = header + merged data.
      let mergedDataFile = null;
      if (runFiles.length === 1) {
        mergedDataFile = runFiles[0]; // cleaned up by the finally block
      } else if (runFiles.length > 1) {
        mergedDataFile = nextTmpFile();
        await multiPassMerge(runFiles, mergedDataFile, comparator, nextTmpFile);
      }

      await new Promise((resolve, reject) => {
        const ws = fs.createWriteStream(outfile);
        let settled = false;
        const fail = err => {
          if (settled) return;
          settled = true;
          ws.destroy();
          try { fs.unlinkSync(outfile); } catch { /* best-effort */ }
          reject(err);
        };
        ws.on('error', fail);

        const headerLine = JSON.stringify(headerRow) + '\n';
        if (!mergedDataFile) {
          // Header only — no data rows.
          ws.end(headerLine);
          ws.once('finish', () => { settled = true; resolve(); });
        } else {
          ws.write(headerLine, writeErr => {
            if (writeErr) return fail(writeErr);
            const rs = fs.createReadStream(mergedDataFile);
            rs.on('error', fail);
            rs.pipe(ws);
            ws.once('finish', () => { settled = true; resolve(); });
          });
        }
      });
    } else if (runFiles.length === 0) {
      fs.writeFileSync(outfile, '');
    } else if (runFiles.length === 1) {
      // safeRename handles EXDEV (cross-filesystem) by falling back to
      // stream-copy + unlink, so outfile is always populated correctly.
      await safeRename(runFiles[0], outfile);
      // The file is now at outfile (or already unlinked on EXDEV path),
      // so remove it from the cleanup set to avoid a spurious unlink error.
      createdTmpFiles.delete(runFiles[0]);
    } else {
      // multiPassMerge batches the fan-in to MAX_MERGE_FAN_IN files per pass,
      // bounding the number of concurrently open file descriptors.
      // Intermediate files are allocated via nextTmpFile() so they are always
      // tracked in createdTmpFiles for cleanup.
      await multiPassMerge(runFiles, outfile, comparator, nextTmpFile);
    }
  } finally {
    for (const f of createdTmpFiles) {
      try { fs.unlinkSync(f); } catch { /* best-effort cleanup */ }
    }
    try { fs.rmdirSync(tmpDir); } catch { /* best-effort cleanup */ }
  }
}

module.exports = { sortFile };
