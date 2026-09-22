const stream = require('stream');
const { StringDecoder } = require('string_decoder');

// Replacement for the deprecated 'byline' package (https://github.com/jahewson/node-byline),
// originally (C) 2011-2015 John Hewson, MIT licensed.

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
    this.decoder = null;
    this.decoderEncoding = 'utf8';

    // take the source's encoding if we don't have one
    this.on('pipe', src => {
      if (!this.encoding && src instanceof stream.Readable) {
        this.encoding = src._readableState.encoding;
      }
    });
  }

  _transform(chunk, encoding, done) {
    this._appendText(this._decode(chunk, encoding));
    this._pushBuffer(1, done);
  }

  _flush(done) {
    // emit bytes of the last character, if it remained incomplete
    if (this.decoder) {
      this._appendText(this.decoder.end());
    }
    this._pushBuffer(0, done);
  }

  /**
   * Decodes binary chunk into string. Decoder keeps its state between chunks, so that
   * a multi-byte character splitted between two chunks is not decoded as replacement characters.
   */
  _decode(chunk, encoding) {
    if (!Buffer.isBuffer(chunk)) {
      // encoded source stream gives us strings, no decoding is needed
      return chunk;
    }

    const decoderEncoding = !encoding || encoding == 'buffer' ? 'utf8' : encoding;
    if (!this.decoder || this.decoderEncoding != decoderEncoding) {
      // encoding should not change during the stream, but if it does, don't lose buffered bytes
      const rest = this.decoder ? this.decoder.end() : '';
      this.decoder = new StringDecoder(decoderEncoding);
      this.decoderEncoding = decoderEncoding;
      return rest + this.decoder.write(chunk);
    }
    return this.decoder.write(chunk);
  }

  _appendText(text) {
    if (text.length == 0) {
      // whole chunk is held by the decoder as a beginning of a splitted character
      return;
    }

    const lines = text.split(LINE_BOUNDARY_REGEX);

    // don't split CRLF which spans chunks
    if (this.lastChunkEndedWithCR && text[0] == '\n') {
      lines.shift();
    }

    if (this.lineBuffer.length > 0 && lines.length > 0) {
      this.lineBuffer[this.lineBuffer.length - 1] += lines.shift();
    }

    this.lastChunkEndedWithCR = text[text.length - 1] == '\r';
    this.lineBuffer = this.lineBuffer.concat(lines);
  }

  _pushBuffer(keep, done) {
    // always buffer the last (possibly partial) line
    while (this.lineBuffer.length > keep) {
      const line = this.lineBuffer.shift();
      // skip empty lines
      if (this.keepEmptyLines || line.length > 0) {
        if (!this.push(this._encodeLine(line))) {
          // when the high-water mark is reached, defer pushes until the next tick
          setImmediate(() => this._pushBuffer(keep, done));
          return;
        }
      }
    }
    done();
  }

  // see Readable::push
  _encodeLine(line) {
    if (this.encoding) {
      // source stream is encoded, so it emits strings and we emit strings as well
      return line;
    }
    // source stream is binary, so we emit buffers encoded the same way as the source
    return Buffer.from(line, this.decoderEncoding);
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
