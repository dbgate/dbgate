const fs = require('fs');
const stream = require('stream');
const byline = require('byline');
const { getLogger } = require('dbgate-tools');
const download = require('./download');
const logger = getLogger('jsonLinesReader');

class ParseStream extends stream.Transform {
  constructor({ limitRows }) {
    super({ objectMode: true });
    this.wasHeader = false;
    this.limitRows = limitRows;
    this.rowsWritten = 0;
    this.lineNumber = 0;
  }
  _transform(chunk, encoding, done) {
    this.lineNumber += 1;
    const line = chunk.toString();
    let obj;
    try {
      obj = JSON.parse(line);
    } catch (err) {
      const preview = line.length > 120 ? line.slice(0, 120) + '...' : line;
      const wrapped = new Error(`Failed to parse JSON on line ${this.lineNumber}: ${err.message}\nContent: ${preview}`, { cause: err });
      done(wrapped);
      return;
    }
    if (!this.wasHeader) {
      if (!obj.__isStreamHeader) {
        this.push({
          __isStreamHeader: true,
          __isDynamicStructure: true,
          // columns: Object.keys(obj).map(columnName => ({ columnName })),
        });
      }

      this.wasHeader = true;
    }
    if (!this.limitRows || this.rowsWritten < this.limitRows) {
      this.push(obj);
      this.rowsWritten += 1;
    }
    done();
  }
}

/**
 * Reader function, which reads JSNOL file or URL. JSONL format - text file, every line is JSON encoded row.
 * @param {Object} options
 * @param {string} options.fileName - file name or URL
 * @param {string} options.encoding - encoding of the file
 * @param {number} options.limitRows - maximum number of rows to read
 * @returns {Promise<readerType>} - reader object
 */
async function jsonLinesReader({ fileName, encoding = 'utf-8', limitRows = undefined }) {
  logger.info(`DBGM-00054 Reading file ${fileName}`);

  const downloadedFile = await download(fileName);

  const fileStream = fs.createReadStream(
    downloadedFile,
    // @ts-ignore
    encoding
  );
  const liner = byline(fileStream);
  const parser = new ParseStream({ limitRows });
  return [liner, parser];
}

module.exports = jsonLinesReader;
