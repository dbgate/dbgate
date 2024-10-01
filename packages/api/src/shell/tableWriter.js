const { fullNameToString, getLogger } = require('dbgate-tools');
const requireEngineDriver = require('../utility/requireEngineDriver');
const connectUtility = require('../utility/connectUtility');
const logger = getLogger('tableWriter');

async function tableWriter({ connection, schemaName, pureName, driver, systemConnection, ...options }) {
  logger.info(`Writing table ${fullNameToString({ schemaName, pureName })}`);

  if (!driver) {
    driver = requireEngineDriver(connection);
  }
  const dbhan = systemConnection || (await connectUtility(driver, connection, 'write'));

  logger.info(`Connected.`);
  return await driver.writeTable(dbhan, { schemaName, pureName }, options);
}

module.exports = tableWriter;
