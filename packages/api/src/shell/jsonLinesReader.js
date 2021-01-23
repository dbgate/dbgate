const fs = require('fs');
const stream = require('stream');
const byline = require('byline');

class ParseStream extends stream.Transform {
  constructor({ header, limitRows }) {
    super({ objectMode: true });
    this.header = header;
    this.wasHeader = false;
    this.limitRows = limitRows;
    this.rowsWritten = 0;
  }
  _transform(chunk, encoding, done) {
    const obj = JSON.parse(chunk);
    if (!this.wasHeader) {
      if (!this.header) this.push({ columns: Object.keys(obj).map(columnName => ({ columnName })) });
      this.wasHeader = true;
    }
    if (!this.limitRows || this.rowsWritten < this.limitRows) {
      this.push(obj);
      this.rowsWritten += 1;
    }
    done();
  }
}

async function jsonLinesReader({ fileName, encoding = 'utf-8', header = true, limitRows = undefined }) {
  console.log(`Reading file ${fileName}`);

  const fileStream = fs.createReadStream(fileName, encoding);
  const liner = byline(fileStream);
  const parser = new ParseStream({ header, limitRows });
  liner.pipe(parser);
  return parser;
}

module.exports = jsonLinesReader;
