const fs = require('fs');
const requireEngineDriver = require('../utility/requireEngineDriver');
const { connectUtility } = require('../utility/connectUtility');
const { splitQueryStream } = require('dbgate-query-splitter/lib/splitQueryStream');
const download = require('./download');
const stream = require('stream');
const { getLogger } = require('dbgate-tools');
const streamPipeline = require('../utility/streamPipeline');

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
      } else if (chunk.specialMarker == 'copy_stdin_line') {
        this.writeQueryStream.write(chunk.text);
      } else if (chunk.specialMarker == 'copy_stdin_end') {
        this.writeQueryStream.end();
        await new Promise((resolve, reject) => {
          this.writeQueryStream.on('finish', resolve);
          this.writeQueryStream.on('error', reject);
        });
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

async function importDatabase({ connection = undefined, systemConnection = undefined, driver = undefined, inputFile }) {
  logger.info(`Importing database`);

  if (!driver) driver = requireEngineDriver(connection);
  const dbhan = systemConnection || (await connectUtility(driver, connection, 'write'));
  try {
    logger.info(`Input file: ${inputFile}`);
    const downloadedFile = await download(inputFile);
    logger.info(`Downloaded file: ${downloadedFile}`);

    const fileStream = fs.createReadStream(downloadedFile, 'utf-8');
    const splittedStream = splitQueryStream(fileStream, {
      ...driver.getQuerySplitterOptions('import'),
      returnRichInfo: true,
    });
    const importStream = new ImportStream(dbhan, driver);

    await streamPipeline(splittedStream, importStream);
  } finally {
    if (!systemConnection) {
      await driver.close(dbhan);
    }
  }
}

module.exports = importDatabase;
