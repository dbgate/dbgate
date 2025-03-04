const requireEngineDriver = require('../utility/requireEngineDriver');
const { connectUtility } = require('../utility/connectUtility');
const { getLogger } = require('dbgate-tools');
const exportDbModel = require('../utility/exportDbModel');

const logger = getLogger('analyseDb');

async function loadDatabase({ connection = undefined, systemConnection = undefined, driver = undefined, outputDir }) {
  logger.debug(`Analysing database`);

  if (!driver) driver = requireEngineDriver(connection);
  const dbhan = systemConnection || (await connectUtility(driver, connection, 'read', { forceRowsAsObjects: true }));
  try {
    const dbInfo = await driver.analyseFull(dbhan);
    logger.debug(`Analyse finished`);

    await exportDbModel(dbInfo, outputDir);
  } finally {
    if (!systemConnection) {
      await driver.close(dbhan);
    }
  }
}

module.exports = loadDatabase;
