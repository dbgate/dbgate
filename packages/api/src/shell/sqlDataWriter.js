const fs = require('fs');
const stream = require('stream');
const path = require('path');
const { driverBase, getLogger } = require('dbgate-tools');
const requireEngineDriver = require('../utility/requireEngineDriver');
const logger = getLogger('sqlDataWriter');

class SqlizeStream extends stream.Transform {
  constructor({ fileName, dataName }) {
    super({ objectMode: true });
    this.wasHeader = false;
    this.tableName = path.parse(fileName).name;
    this.dataName = dataName;
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
        { pureName: this.dataName || this.tableName },
        Object.keys(chunk),
        Object.values(chunk)
      );
      this.push(dmp.s);
    }
    done();
  }
}

async function sqlDataWriter({ fileName, dataName, driver, encoding = 'utf-8' }) {
  logger.info(`Writing file ${fileName}`);
  const stringify = new SqlizeStream({ fileName, dataName });
  const fileStream = fs.createWriteStream(fileName, encoding);
  return [stringify, fileStream];
  // stringify.pipe(fileStream);
  // stringify['finisher'] = fileStream;
  // return stringify;
}

module.exports = sqlDataWriter;
