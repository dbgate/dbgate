const requireEngineDriver = require("../utility/requireEngineDriver");

async function tableWriter({ connection, schemaName, pureName, ...options }) {
  console.log(`Write table ${schemaName}.${pureName}`);

  const driver = requireEngineDriver(connection);
  const pool = await driver.connect(connection);
  console.log(`Connected.`);
  return await driver.writeTable(pool, { schemaName, pureName }, options);
}

module.exports = tableWriter;
