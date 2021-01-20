const { fullNameToString } = require('dbgate-tools');
const requireEngineDriver = require('../utility/requireEngineDriver');
const { decryptConnection } = require('../utility/crypting');

async function tableWriter({ connection, schemaName, pureName, ...options }) {
  console.log(`Writing table ${fullNameToString({ schemaName, pureName })}`);

  const driver = requireEngineDriver(connection);
  const pool = await driver.connect(decryptConnection(connection));
  console.log(`Connected.`);
  return await driver.writeTable(pool, { schemaName, pureName }, options);
}

module.exports = tableWriter;
