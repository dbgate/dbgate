const fs = require('fs');
const stream = require('stream');

class StringifyStream extends stream.Transform {
  constructor() {
    super({ objectMode: true });
    this.wasHeader = false;
    this.wasRecord = false;
  }
  _transform(chunk, encoding, done) {
    let skip = false;

    if (!this.wasHeader) {
      skip = chunk.__isStreamHeader;
      this.wasHeader = true;
    }
    if (!skip) {
      if (!this.wasRecord) {
        this.push('[\n');
      } else {
        this.push(',\n');
      }
      this.wasRecord = true;

      this.push(JSON.stringify(chunk));
    }
    done();
  }

  _flush(done) {
    if (!this.wasRecord) {
      this.push('[]\n');
    } else {
      this.push('\n]\n');
    }
    done();
  }
}

async function jsonArrayWriter({ fileName, encoding = 'utf-8' }) {
  console.log(`Writing file ${fileName}`);
  const stringify = new StringifyStream();
  const fileStream = fs.createWriteStream(fileName, encoding);
  stringify.pipe(fileStream);
  stringify['finisher'] = fileStream;
  return stringify;
}

module.exports = jsonArrayWriter;
