const requireEngineDriver = require('../utility/requireEngineDriver');
const { decryptConnection } = require('../utility/crypting');
const connectUtility = require('../utility/connectUtility');

async function queryReader({ connection, sql }) {
  console.log(`Reading query ${sql}`);

  const driver = requireEngineDriver(connection);
  const pool = await connectUtility(driver, connection, 'script');
  console.log(`Connected.`);
  return await driver.readQuery(pool, sql);
}

module.exports = queryReader;
