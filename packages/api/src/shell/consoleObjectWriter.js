const stream = require('stream');

class ObjectWriterStream extends stream.Writable {
  _write(chunk, enc, next) {
    console.log(JSON.stringify(chunk));
    next();
  }
}

async function consoleObjectWriter() {
  return new ObjectWriterStream({
    objectMode: true,
  });
}

module.exports = consoleObjectWriter;
