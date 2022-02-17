const fs = require('fs');
const stream = require('stream');
const path = require('path');
const { driverBase } = require('dbgate-tools');
const requireEngineDriver = require('../utility/requireEngineDriver');

class SqlizeStream extends stream.Transform {
  constructor({ fileName }) {
    super({ objectMode: true });
    this.wasHeader = false;
    this.tableName = path.parse(fileName).name;
    this.driver = driverBase;
  }
  _transform(chunk, encoding, done) {
    let skip = false;
    if (!this.wasHeader) {
      if (chunk.__isStreamHeader) {
        skip = true;
        this.tableName = chunk.pureName;
        if (chunk.engine) {
          // @ts-ignore
          this.driver = requireEngineDriver(chunk.engine) || driverBase;
        }
      }
      this.wasHeader = true;
    }
    if (!skip) {
      const dmp = this.driver.createDumper();
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
