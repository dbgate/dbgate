const fs = require('fs');
const requireEngineDriver = require('../utility/requireEngineDriver');
const connectUtility = require('../utility/connectUtility');
const { splitQueryStream } = require('dbgate-query-splitter/lib/splitQueryStream');
const download = require('./download');
const stream = require('stream');
const { getLogger } = require('dbgate-tools');

const logger = getLogger('importDb');

class ImportStream extends stream.Transform {
  constructor(dbhan, driver) {
    super({ objectMode: true });
    this.dbhan = dbhan;
    this.driver = driver;
    this.writeQueryStream = null;
  }
  async _transform(chunk, encoding, cb) {
    try {
      if (chunk.specialMarker == 'copy_stdin_start') {
        this.writeQueryStream = await this.driver.writeQueryFromStream(this.dbhan, chunk.text);
      } else if (chunk.specialMarker == 'copy_stdin_data') {
        this.writeQueryStream.write(chunk.text);
      } else if (chunk.specialMarker == 'copy_stdin_end') {
        this.writeQueryStream.end();
        this.writeQueryStream = null;
      } else {
        await this.driver.script(this.dbhan, chunk.text, { queryOptions: { importSqlDump: true } });
      }
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
  logger.info(`Importing database`);

  if (!driver) driver = requireEngineDriver(connection);
  const dbhan = systemConnection || (await connectUtility(driver, connection, 'write'));
  logger.info(`Connected.`);

  logger.info(`Input file: ${inputFile}`);
  const downloadedFile = await download(inputFile);
  logger.info(`Downloaded file: ${downloadedFile}`);

  const fileStream = fs.createReadStream(downloadedFile, 'utf-8');
  const splittedStream = splitQueryStream(fileStream, {
    ...driver.getQuerySplitterOptions('import'),
    returnRichInfo: true,
  });
  const importStream = new ImportStream(dbhan, driver);
  // @ts-ignore
  splittedStream.pipe(importStream);
  await awaitStreamEnd(importStream);
}

module.exports = importDatabase;
