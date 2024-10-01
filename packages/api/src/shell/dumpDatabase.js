const requireEngineDriver = require('../utility/requireEngineDriver');
const connectUtility = require('../utility/connectUtility');
const { getLogger } = require('dbgate-tools');

const logger = getLogger('dumpDb');

function doDump(dumper) {
  return new Promise((resolve, reject) => {
    dumper.once('end', () => {
      resolve(true);
    });
    dumper.once('error', err => {
      reject(err);
    });
    dumper.run();
  });
}

async function dumpDatabase({
  connection = undefined,
  systemConnection = undefined,
  driver = undefined,
  outputFile,
  databaseName,
  schemaName,
}) {
  logger.info(`Dumping database`);

  if (!driver) driver = requireEngineDriver(connection);

  const dbhan = systemConnection || (await connectUtility(driver, connection, 'read', { forceRowsAsObjects: true }));

  try {
    logger.info(`Connected.`);

    const dumper = await driver.createBackupDumper(dbhan, {
      outputFile,
      databaseName,
      schemaName,
    });
    await doDump(dumper);
  } finally {
    if (!systemConnection) {
      await driver.close(dbhan);
    }
  }
}

module.exports = dumpDatabase;
