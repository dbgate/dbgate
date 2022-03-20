const requireEngineDriver = require('../utility/requireEngineDriver');
const connectUtility = require('../utility/connectUtility');

async function queryReader({
  connection,
  query,
  queryType,
  // obsolete; use query instead
  sql,
}) {
  // if (sql && json) {
  //   throw new Error('Only one of sql or json could be set');
  // }
  // if (!sql && !json) {
  //   throw new Error('One of sql or json must be set');
  // }
  console.log(`Reading query ${query || sql}`);
  // else console.log(`Reading query ${JSON.stringify(json)}`);

  const driver = requireEngineDriver(connection);
  const pool = await connectUtility(driver, connection, queryType == 'json' ? 'read' : 'script');
  console.log(`Connected.`);
  return queryType == 'json' ? await driver.readJsonQuery(pool, query) : await driver.readQuery(pool, query || sql);
}

module.exports = queryReader;
