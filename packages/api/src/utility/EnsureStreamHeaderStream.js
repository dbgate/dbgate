const stream = require('stream');

class EnsureStreamHeaderStream extends stream.Transform {
  constructor() {
    super({ objectMode: true });
    this.wasHeader = false;
  }
  _transform(chunk, encoding, done) {
    if (!this.wasHeader) {
      if (chunk.__isDynamicStructure) {
        // ignore dynamic structure header
        done();
        return;
      }

      if (!chunk.__isStreamHeader) {
        this.push({
          __isStreamHeader: true,
          __isComputedStructure: true,
          columns: Object.keys(chunk).map(columnName => ({ columnName })),
        });
      }

      this.wasHeader = true;
    }
    this.push(chunk);
    done();
  }
}

module.exports = EnsureStreamHeaderStream;
