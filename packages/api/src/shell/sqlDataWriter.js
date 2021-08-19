const fs = require('fs');
const stream = require('stream');
const path = require('path');
const { driverBase } = require('dbgate-tools');

class SqlizeStream extends stream.Transform {
  constructor({ fileName }) {
    super({ objectMode: true });
    this.wasHeader = false;
    this.tableName = path.parse(fileName).name;
  }
  _transform(chunk, encoding, done) {
    let skip = false;
    if (!this.wasHeader) {
      if (
        chunk.__isStreamHeader ||
        // TODO remove isArray test
        Array.isArray(chunk.columns)
      ) {
        skip = true;
        this.tableName = chunk.pureName;
      }
      this.wasHeader = true;
    }
    if (!skip) {
      const dmp = driverBase.createDumper();
      dmp.put(
        '^insert ^into %f (%,i) ^values (%,v);\n',
        { pureName: this.tableName },
        Object.keys(chunk),
        Object.values(chunk)
      );
      this.push(dmp.s);
    }
    done();
  }
}

async function sqlDataWriter({ fileName, driver, encoding = 'utf-8' }) {
  console.log(`Writing file ${fileName}`);
  const stringify = new SqlizeStream({ fileName });
  const fileStream = fs.createWriteStream(fileName, encoding);
  stringify.pipe(fileStream);
  stringify['finisher'] = fileStream;
  return stringify;
}

module.exports = sqlDataWriter;
