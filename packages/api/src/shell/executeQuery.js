const { splitQuery } = require('dbgate-query-splitter');
const requireEngineDriver = require('../utility/requireEngineDriver');
const connectUtility = require('../utility/connectUtility');

async function executeQuery({ connection, sql }) {
  console.log(`Execute query ${sql}`);

  const driver = requireEngineDriver(connection);
  const pool = await connectUtility(driver, connection);
  console.log(`Connected.`);

  for (const sqlItem of splitQuery(sql, driver.getQuerySplitterOptions('script'))) {
    console.log('Executing query', sqlItem);
    await driver.query(pool, sqlItem, { discardResult: true });
  }

  console.log(`Query finished`);
}

module.exports = executeQuery;
