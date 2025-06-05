const fs = require('fs');
const stream = require('stream');
const byline = require('byline');
const { getLogger } = require('dbgate-tools');
const download = require('./download');
const logger = getLogger('jsonLinesReader');

class ParseStream extends stream.Transform {
  constructor({ limitRows, transformRow }) {
    super({ objectMode: true });
    this.wasHeader = false;
    this.limitRows = limitRows;
    this.transformRow = transformRow;
    this.rowsWritten = 0;
  }
  _transform(chunk, encoding, done) {
    const obj = JSON.parse(chunk);
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
      if (this.transformRow) {
        this.push(this.transformRow(obj));
      } else {
        this.push(obj);
      }
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
 * @param {((row: Record<string, any>) => Record<string, any>) | undefined} options.transformRow - function to transform each row
 * @returns {Promise<readerType>} - reader object
 */
async function jsonLinesReader({ fileName, encoding = 'utf-8', limitRows = undefined, transformRow }) {
  logger.info(`Reading file ${fileName}`);

  const downloadedFile = await download(fileName);

  const fileStream = fs.createReadStream(
    downloadedFile,
    // @ts-ignore
    encoding
  );
  const liner = byline(fileStream);
  const parser = new ParseStream({ limitRows, transformRow });
  return [liner, parser];
}

module.exports = jsonLinesReader;
