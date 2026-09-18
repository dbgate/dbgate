const stream = require('stream');

// Replacement for the deprecated 'byline' package (https://github.com/jahewson/node-byline),
// originally (C) 2011-2015 John Hewson, MIT licensed. Same behaviour, without deprecated APIs.

// see: http://www.unicode.org/reports/tr18/#Line_Boundaries
const LINE_BOUNDARY_REGEX = new RegExp('\\r\\n|[\\n\\v\\f\\r\\x85\\u2028\\u2029]');

class LineStream extends stream.Transform {
  constructor(options = {}) {
    // use objectMode to stop the output from being buffered,
    // which re-concatenates the lines, just without newlines
    super({ ...options, readableObjectMode: true });

    this.lineBuffer = [];
    this.keepEmptyLines = options.keepEmptyLines || false;
    this.lastChunkEndedWithCR = false;
    this.chunkEncoding = 'utf8';

    // take the source's encoding if we don't have one
    this.on('pipe', src => {
      if (!this.encoding && src instanceof stream.Readable) {
        this.encoding = src._readableState.encoding;
      }
    });
  }

  _transform(chunk, encoding, done) {
    // decode binary chunks as UTF-8
    let chunkEncoding = encoding || 'utf8';

    if (Buffer.isBuffer(chunk)) {
      if (chunkEncoding == 'buffer') {
        chunkEncoding = 'utf8';
      }
      chunk = chunk.toString(chunkEncoding);
    }
    this.chunkEncoding = chunkEncoding;

    const lines = chunk.split(LINE_BOUNDARY_REGEX);

    // don't split CRLF which spans chunks
    if (this.lastChunkEndedWithCR && chunk[0] == '\n') {
      lines.shift();
    }

    if (this.lineBuffer.length > 0) {
      this.lineBuffer[this.lineBuffer.length - 1] += lines.shift();
    }

    this.lastChunkEndedWithCR = chunk[chunk.length - 1] == '\r';
    this.lineBuffer = this.lineBuffer.concat(lines);
    this._pushBuffer(chunkEncoding, 1, done);
  }

  _flush(done) {
    this._pushBuffer(this.chunkEncoding, 0, done);
  }

  _pushBuffer(encoding, keep, done) {
    // always buffer the last (possibly partial) line
    while (this.lineBuffer.length > keep) {
      const line = this.lineBuffer.shift();
      // skip empty lines
      if (this.keepEmptyLines || line.length > 0) {
        if (!this.push(this._reencode(line, encoding))) {
          // when the high-water mark is reached, defer pushes until the next tick
          setImmediate(() => this._pushBuffer(encoding, keep, done));
          return;
        }
      }
    }
    done();
  }

  // see Readable::push
  _reencode(line, chunkEncoding) {
    if (this.encoding && this.encoding != chunkEncoding) {
      return Buffer.from(line, chunkEncoding).toString(this.encoding);
    }
    if (this.encoding) {
      // this should be the most common case, i.e. we're using an encoded source stream
      return line;
    }
    return Buffer.from(line, chunkEncoding);
  }
}

/**
 * Splits given readable stream into lines. Returned stream emits one line per 'data' event.
 * @param {stream.Readable} readStream - source stream
 * @param {object} [options] - stream options, additionally supports keepEmptyLines flag
 * @returns {LineStream}
 */
function createLineStream(readStream, options = undefined) {
  if (!readStream) {
    throw new Error('DBGM-00000 Expected readStream');
  }
  if (!readStream.readable) {
    throw new Error('DBGM-00000 readStream must be readable');
  }
  const lineStream = new LineStream(options);
  readStream.pipe(lineStream);
  return lineStream;
}

module.exports = { createLineStream, LineStream };
