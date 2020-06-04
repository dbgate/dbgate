const driverConnect = require('../utility/driverConnect');

const engines = require('@dbgate/engines');

async function queryReader({ connection, sql }) {
  console.log(`Reading query ${sql}`);

  const driver = engines(connection);
  const pool = await driverConnect(driver, connection);
  console.log(`Connected.`);
  return driver.readableStream(pool, sql);
}

module.exports = queryReader;
