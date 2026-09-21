const fs = require('fs/promises');
const { Readable } = require('stream');

const NEWLINE = 0x0a;
const DEFAULT_BUFFER_SIZE = 64 * 1024;

// FileHandle.read() is allowed to return less bytes than requested, so it must be called in cycle
async function readFully(handle, buffer, length, position) {
  let readed = 0;
  while (readed < length) {
    const { bytesRead } = await handle.read(buffer, readed, length - readed, position + readed);
    if (bytesRead <= 0) {
      throw new Error(`File was truncated during reading, could not read ${length} bytes at position ${position}`);
    }
    readed += bytesRead;
  }
}

// parts hold one line split by buffer boundaries, in file order. They are joined only once, when the line is
// completed, so that a line longer than the buffer is not copied again with every read.
function decodeLine(parts) {
  if (parts.length == 0) return '';
  if (parts.length == 1) return parts[0].toString('utf8');
  return Buffer.concat(parts).toString('utf8');
}

async function* generateLinesReverse(fileName, bufferSize) {
  const handle = await fs.open(fileName, 'r');
  try {
    const { size } = await handle.stat();
    let position = size;
    // bytes read so far, which don't form a complete line yet. They never contain a newline, so only the newly
    // read buffer has to be searched.
    let pending = [];

    while (position > 0) {
      const length = Math.min(bufferSize, position);
      position -= length;
      const buffer = Buffer.alloc(length);
      await readFully(handle, buffer, length, position);

      let end = buffer.length;
      while (end > 0) {
        const index = buffer.lastIndexOf(NEWLINE, end - 1);
        if (index < 0) break;
        // pending is decoded together with the segment preceding it, so that multi-byte characters split by the
        // buffer boundary are not broken
        pending.unshift(buffer.subarray(index + 1, end));
        yield decodeLine(pending);
        pending = [];
        end = index;
      }

      if (end > 0) pending.unshift(buffer.subarray(0, end));
    }

    yield decodeLine(pending);
  } finally {
    await handle.close();
  }
}

/**
 * Reads lines of given file in reverse order (from the last line to the first one).
 * Returns readable stream in object mode, which emits single line per 'data' event.
 * Replacement for deprecated fs-reverse package.
 */
function readFileReverse(fileName, options = {}) {
  return Readable.from(generateLinesReverse(fileName, options.bufferSize || DEFAULT_BUFFER_SIZE));
}

module.exports = readFileReverse;
