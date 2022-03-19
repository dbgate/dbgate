const { fullNameToString } = require('dbgate-tools');
const requireEngineDriver = require('../utility/requireEngineDriver');
const connectUtility = require('../utility/connectUtility');

async function tableWriter({ connection, schemaName, pureName, driver, systemConnection, ...options }) {
  console.log(`Writing table ${fullNameToString({ schemaName, pureName })}`);

  if (!driver) {
    driver = requireEngineDriver(connection);
  }
  const pool = systemConnection || (await connectUtility(driver, connection, 'write'));

  console.log(`Connected.`);
  return await driver.writeTable(pool, { schemaName, pureName }, options);
}

module.exports = tableWriter;
