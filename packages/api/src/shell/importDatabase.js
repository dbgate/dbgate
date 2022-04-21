const fs = require('fs');
const requireEngineDriver = require('../utility/requireEngineDriver');
const connectUtility = require('../utility/connectUtility');
const { splitQueryStream } = require('dbgate-query-splitter/lib/splitQueryStream');
const download = require('./download');
const stream = require('stream');

class ImportStream extends stream.Transform {
  constructor(pool, driver) {
    super({ objectMode: true });
    this.pool = pool;
    this.driver = driver;
  }
  async _transform(chunk, encoding, cb) {
    try {
      await this.driver.script(this.pool, chunk);
    } catch (err) {
      this.emit('error', err.message);
    }
    cb();
  }
  _flush(cb) {
    this.push('finish');
    cb();
    this.emit('end');
  }
}

function awaitStreamEnd(stream) {
  return new Promise((resolve, reject) => {
    stream.once('end', () => {
      resolve(true);
    });
    stream.once('error', err => {
      reject(err);
    });
  });
}

async function importDatabase({ connection = undefined, systemConnection = undefined, driver = undefined, inputFile }) {
  console.log(`Importing database`);

  if (!driver) driver = requireEngineDriver(connection);
  const pool = systemConnection || (await connectUtility(driver, connection, 'write'));
  console.log(`Connected.`);

  const downloadedFile = await download(inputFile);

  const fileStream = fs.createReadStream(downloadedFile, 'utf-8');
  const splittedStream = splitQueryStream(fileStream, driver.getQuerySplitterOptions());
  const importStream = new ImportStream(pool, driver);
  // @ts-ignore
  splittedStream.pipe(importStream);
  await awaitStreamEnd(importStream);
}

module.exports = importDatabase;
