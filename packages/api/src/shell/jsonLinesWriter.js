const fs = require('fs');
const stream = require('stream');

class StringifyStream extends stream.Transform {
  constructor({ header }) {
    super({ objectMode: true });
    this.header = header;
    this.wasHeader = false;
  }
  _transform(chunk, encoding, done) {
    if (!this.wasHeader) {
      if (this.header) this.push(JSON.stringify(chunk) + '\n');
      this.wasHeader = true;
    } else {
      this.push(JSON.stringify(chunk) + '\n');
    }
    done();
  }
}

async function jsonLinesWriter({ fileName, encoding = 'utf-8', header = true }) {
  console.log(`Writing file ${fileName}`);
  const stringify = new StringifyStream({ header });
  const fileStream = fs.createWriteStream(fileName, encoding);
  stringify.pipe(fileStream);
  stringify['finisher'] = fileStream;
  return stringify;
}

module.exports = jsonLinesWriter;
