const requireEngineDriver = require('../utility/requireEngineDriver');
const connectUtility = require('../utility/connectUtility');
const { getLogger } = require('dbgate-tools');
const logger = getLogger();

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
  logger.info({ sql: query || sql }, `Reading query`);
  // else console.log(`Reading query ${JSON.stringify(json)}`);

  const driver = requireEngineDriver(connection);
  const pool = await connectUtility(driver, connection, queryType == 'json' ? 'read' : 'script');
  logger.info(`Connected.`);
  const reader =
    queryType == 'json' ? await driver.readJsonQuery(pool, query) : await driver.readQuery(pool, query || sql);
  return reader;
}

module.exports = queryReader;
