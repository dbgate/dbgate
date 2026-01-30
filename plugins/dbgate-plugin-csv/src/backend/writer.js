const csv = require('csv');
const fs = require('fs');
const stream = require('stream');

const { getLogger } = global.DBGATE_PACKAGES['dbgate-tools'];

const logger = getLogger('csvWriter');

class RecodeTransform extends stream.Transform {
  constructor(toEncoding = 'utf8') {
    super({ readableObjectMode: false, writableObjectMode: false });
    this.to = String(toEncoding).toLowerCase();
    this.decoder = new (global.TextDecoder || require('util').TextDecoder)('utf-8', { fatal: false });
  }

  _encodeString(str) {
    if (this.to === 'utf8' || this.to === 'utf-8') {
      return Buffer.from(str, 'utf8');
    }
    if (this.to === 'utf16le' || this.to === 'ucs2' || this.to === 'utf-16le') {
      return Buffer.from(str, 'utf16le');
    }
    if (this.to === 'utf16be' || this.to === 'utf-16be') {
      const le = Buffer.from(str, 'utf16le');
      for (let i = 0; i + 1 < le.length; i += 2) {
        const a = le[i];
        le[i] = le[i + 1];
        le[i + 1] = a;
      }
      return le;
    }
    throw new Error(`Unsupported target encoding: ${this.to}`);
  }

  _transform(chunk, enc, cb) {
    try {
      if (!Buffer.isBuffer(chunk)) chunk = Buffer.from(chunk, enc);
      const part = this.decoder.decode(chunk, { stream: true });
      if (part.length) this.push(this._encodeString(part));
      cb();
    } catch (e) {
      cb(e);
    }
  }

  _flush(cb) {
    try {
      const rest = this.decoder.decode();
      if (rest.length) this.push(this._encodeString(rest));
      cb();
    } catch (e) {
      cb(e);
    }
  }
}

const INFER_STRUCTURE_ROWS = 100;

class CsvPrepareStream extends stream.Transform {
  constructor({ header }) {
    super({ objectMode: true });
    this.columns = null;
    this.header = header;
    this.cachedRows = null;
  }

  _extractValue(value) {
    if (value && typeof value === 'object' && value.$decimal !== undefined) {
      return value.$decimal;
    }
    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }
    return value;
  }
  _transform(chunk, encoding, done) {
    if (this.columns) {
      this.push(this.columns.map((col) => this._extractValue(chunk[col])));
      done();
    } else {
      if (chunk.__isStreamHeader && chunk.columns?.length > 0) {
        this.columns = chunk.columns.map((x) => x.columnName);
        if (this.header) {
          this.push(this.columns);
        }
        done();
        return;
      }

      if (!this.cachedRows) {
        this.cachedRows = [];
      }
      this.cachedRows.push(chunk);
      if (this.cachedRows.length < INFER_STRUCTURE_ROWS) {
        done();
        return;
      }
      this.inferStructureFromCachedRows();
      done();
    }
  }

  inferStructureFromCachedRows() {
    const allKeys = {};
    for (const row of this.cachedRows) {
      for (const key of Object.keys(row)) {
        allKeys[key] = true;
      }
    }
    this.columns = Object.keys(allKeys);
    if (this.header) {
      this.push(this.columns);
    }
    for (const row of this.cachedRows) {
      this.push(this.columns.map((col) => this._extractValue(row[col])));
    }
    this.cachedRows = null;
  }

  _final(callback) {
    if (this.cachedRows) {
      this.inferStructureFromCachedRows();
    }
    callback();
  }
}

async function writer({
  fileName,
  encoding = 'utf-8',
  header = true,
  delimiter,
  quoted,
  writeBom,
  writeSepHeader,
  recordDelimiter,
}) {
  logger.info(`DBGM-00133 Writing file ${fileName}`);
  const csvPrepare = new CsvPrepareStream({ header });
  const csvStream = csv.stringify({ delimiter, quoted, record_delimiter: recordDelimiter || undefined });
  const fileStream = fs.createWriteStream(fileName, encoding);
  if (writeBom) {
    switch (encoding.toLowerCase()) {
      case 'utf-8':
      case 'utf8':
        fileStream.write(Buffer.from([0xef, 0xbb, 0xbf]));
        break;
      case 'utf-16':
      case 'utf16':
        fileStream.write(Buffer.from([0xff, 0xfe]));
        break;
      case 'utf-16le':
      case 'utf16le':
        fileStream.write(Buffer.from([0xff, 0xfe]));
        break;
      case 'utf-16be':
      case 'utf16be':
        fileStream.write(Buffer.from([0xfe, 0xff]));
        break;
      case 'utf-32le':
      case 'utf32le':
        fileStream.write(Buffer.from([0xff, 0xfe, 0x00, 0x00]));
        break;
      case 'utf-32be':
      case 'utf32be':
        fileStream.write(Buffer.from([0x00, 0x00, 0xfe, 0xff]));
        break;
      default:
        break;
    }
  }
  if (writeSepHeader) {
    fileStream.write(`sep=${delimiter}${recordDelimiter || '\n'}`);
  }

  csvPrepare.requireFixedStructure = true;

  return encoding.toLowerCase() === 'utf8' || encoding.toLowerCase() === 'utf-8'
    ? [csvPrepare, csvStream, fileStream]
    : [csvPrepare, csvStream, new RecodeTransform(encoding), fileStream];
}

module.exports = writer;
