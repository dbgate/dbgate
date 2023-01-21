const requireEngineDriver = require('../utility/requireEngineDriver');
const connectUtility = require('../utility/connectUtility');
const { getLogger } = require('dbgate-tools');

const logger = getLogger('execQuery');

async function executeQuery({ connection = undefined, systemConnection = undefined, driver = undefined, sql }) {
  logger.info({ sql }, `Execute query`);

  if (!driver) driver = requireEngineDriver(connection);
  const pool = systemConnection || (await connectUtility(driver, connection, 'script'));
  logger.info(`Connected.`);

  await driver.script(pool, sql);
}

module.exports = executeQuery;
