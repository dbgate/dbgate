const fs = require('fs');
const stream = require('stream');
const byline = require('byline');
const { getLogger } = require('dbgate-tools');
const logger = getLogger();

class ParseStream extends stream.Transform {
  constructor({ limitRows }) {
    super({ objectMode: true });
    this.wasHeader = false;
    this.limitRows = limitRows;
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
      this.push(obj);
      this.rowsWritten += 1;
    }
    done();
  }
}

async function jsonLinesReader({ fileName, encoding = 'utf-8', limitRows = undefined }) {
  logger.info(`Reading file ${fileName}`);

  const fileStream = fs.createReadStream(fileName, encoding);
  const liner = byline(fileStream);
  const parser = new ParseStream({ limitRows });
  liner.pipe(parser);
  return parser;
}

module.exports = jsonLinesReader;
