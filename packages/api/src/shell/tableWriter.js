const driverConnect = require('../utility/driverConnect');

const engines = require('@dbgate/engines');

async function tableWriter({ connection, schemaName, pureName, ...options }) {
  console.log(`Write table ${schemaName}.${pureName}`);

  const driver = engines(connection);
  const pool = await driverConnect(driver, connection);
  console.log(`Connected.`);
  return await driver.writeTable(pool, { schemaName, pureName }, options);
}

module.exports = tableWriter;
