const requireEngineDriver = require('../utility/requireEngineDriver');
const connectUtility = require('../utility/connectUtility');

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
  console.log(`Dumping database`);

  if (!driver) driver = requireEngineDriver(connection);
  const pool = systemConnection || (await connectUtility(driver, connection, 'read', { forceRowsAsObjects: true }));
  console.log(`Connected.`);

  const dumper = await driver.createBackupDumper(pool, {
    outputFile,
    databaseName,
    schemaName,
  });
  await doDump(dumper);
}

module.exports = dumpDatabase;
