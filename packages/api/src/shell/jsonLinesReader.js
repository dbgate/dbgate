const fs = require('fs');
const stream = require('stream');
const byline = require('byline');

class ParseStream extends stream.Transform {
  constructor({ header }) {
    super({ objectMode: true });
    this.header = header;
    this.wasHeader = false;
  }
  _transform(chunk, encoding, done) {
    const obj = JSON.parse(chunk);
    if (!this.wasHeader) {
      if (!this.header) this.push({ columns: Object.keys(obj).map((columnName) => ({ columnName })) });
      this.wasHeader = true;
    }
    this.push(obj);
    done();
  }
}

async function jsonLinesReader({ fileName, encoding = 'utf-8', header = true }) {
  console.log(`Reading file ${fileName}`);

  const fileStream = fs.createReadStream(fileName, encoding);
  const liner = byline(fileStream);
  const parser = new ParseStream({ header });
  liner.pipe(parser);
  return parser;
}

module.exports = jsonLinesReader;
