const goSplit = require('../utility/goSplit');
const requireEngineDriver = require('../utility/requireEngineDriver');

async function executeQuery({ connection, sql }) {
  console.log(`Execute query ${sql}`);

  const driver = requireEngineDriver(connection);
  const pool = await driver.connect(connection);
  console.log(`Connected.`);

  for (const sqlItem of goSplit(sql)) {
    console.log('Executing query', sqlItem);
    await driver.query(pool, sqlItem);
  }

  console.log(`Query finished`);
}

module.exports = executeQuery;
