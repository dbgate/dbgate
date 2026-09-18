const fs = require('fs/promises');
const { Readable } = require('stream');

const NEWLINE = 0x0a;
const DEFAULT_BUFFER_SIZE = 64 * 1024;

async function* generateLinesReverse(fileName, bufferSize) {
  const handle = await fs.open(fileName, 'r');
  try {
    const { size } = await handle.stat();
    let position = size;
    // bytes read so far, which don't form a complete line yet
    let remainder = Buffer.alloc(0);

    while (position > 0) {
      const length = Math.min(bufferSize, position);
      position -= length;
      const buffer = Buffer.alloc(length);
      await handle.read(buffer, 0, length, position);

      // remainder is appended, so that multi-byte characters split by the chunk boundary are not broken
      const chunk = Buffer.concat([buffer, remainder]);
      let end = chunk.length;
      while (end > 0) {
        const index = chunk.lastIndexOf(NEWLINE, end - 1);
        if (index < 0) break;
        yield chunk.toString('utf8', index + 1, end);
        end = index;
      }
      remainder = chunk.subarray(0, end);
    }

    yield remainder.toString('utf8');
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
