const stream = require('stream');

class CollectorWriterStream extends stream.Writable {
  constructor(options) {
    super(options);
    this.rows = [];
    this.structure = null;
    this.runid = options.runid;
  }
  _write(chunk, enc, next) {
    if (!this.structure) this.structure = chunk;
    else this.rows.push(chunk);
    next();
  }

  _final(callback) {
    process.send({
      msgtype: 'dataResult',
      runid: this.runid,
      dataResult: { rows: this.rows, structure: this.structure },
    });
    callback();
  }
}

async function collectorWriter({ runid }) {
  return new CollectorWriterStream({
    objectMode: true,
    runid,
  });
}

module.exports = collectorWriter;
