const stream = require('stream');
const { transformRowUsingColumnMap } = require('dbgate-tools');

class ColumnMapTransformStream extends stream.Transform {
  constructor(columns) {
    super({ objectMode: true });
    this.columns = columns;
  }
  _transform(chunk, encoding, done) {
    if (chunk.__isStreamHeader) {
      // skip stream header
      done();
      return;
    }

    this.push(transformRowUsingColumnMap(chunk, this.columns));
    done();
  }
}

module.exports = ColumnMapTransformStream;
