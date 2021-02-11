const { fullNameToString } = require('dbgate-tools');
const requireEngineDriver = require('../utility/requireEngineDriver');
const { decryptConnection } = require('../utility/crypting');
const connectUtility = require('../utility/connectUtility');

async function tableWriter({ connection, schemaName, pureName, ...options }) {
  console.log(`Writing table ${fullNameToString({ schemaName, pureName })}`);

  const driver = requireEngineDriver(connection);
  const pool = await connectUtility(driver, connection);
  console.log(`Connected.`);
  return await driver.writeTable(pool, { schemaName, pureName }, options);
}

module.exports = tableWriter;
