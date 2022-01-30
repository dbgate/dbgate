const fs = require('fs');
const stream = require('stream');

class StringifyStream extends stream.Transform {
  constructor() {
    super({ objectMode: true });
  }
  _transform(chunk, encoding, done) {
    this.push(JSON.stringify(chunk) + '\n');
    done();
  }
}

async function writer({ fileName, encoding = 'utf-8' }) {
  console.log(`Writing file ${fileName}`);
  const stringify = new StringifyStream();
  const fileStream = fs.createWriteStream(fileName, encoding);
  stringify.pipe(fileStream);
  stringify['finisher'] = fileStream;
  return stringify;
}

module.exports = writer;
