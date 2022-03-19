const requireEngineDriver = require('../utility/requireEngineDriver');
const connectUtility = require('../utility/connectUtility');

async function executeQuery({ connection = undefined, systemConnection = undefined, driver = undefined, sql }) {
  console.log(`Execute query ${sql}`);

  if (!driver) driver = requireEngineDriver(connection);
  const pool = systemConnection || (await connectUtility(driver, connection, 'write'));
  console.log(`Connected.`);

  await driver.script(pool, sql);
}

module.exports = executeQuery;
