const requireEngineDriver = require('../utility/requireEngineDriver');
const { decryptConnection } = require('../utility/crypting');

async function queryReader({ connection, sql }) {
  console.log(`Reading query ${sql}`);

  const driver = requireEngineDriver(connection);
  const pool = await driver.connect(decryptConnection(connection));
  console.log(`Connected.`);
  return await driver.readQuery(pool, sql);
}

module.exports = queryReader;
