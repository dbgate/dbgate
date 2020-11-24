const requireEngineDriver = require("../utility/requireEngineDriver");

async function queryReader({ connection, sql }) {
  console.log(`Reading query ${sql}`);

  const driver = requireEngineDriver(connection);
  const pool = await driver.connect(connection);
  console.log(`Connected.`);
  return await driver.readQuery(pool, sql);
}

module.exports = queryReader;
