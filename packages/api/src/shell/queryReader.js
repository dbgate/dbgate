const requireEngineDriver = require('../utility/requireEngineDriver');
const { connectUtility } = require('../utility/connectUtility');
const { getLogger } = require('dbgate-tools');
const logger = getLogger('queryReader');

/**
 * Returns reader object for {@link copyStream} function. This reader object reads data from query.
 * @param {object} options
 * @param {connectionType} options.connection - connection object
 * @param {object} options.systemConnection - system connection (result of driver.connect). If not provided, new connection will be created
 * @param {object} options.driver - driver object. If not provided, it will be loaded from connection
 * @param {string} options.query - SQL query
 * @param {string} [options.queryType] - query type
 * @param {string} [options.sql] - SQL query. obsolete; use query instead
 * @returns {Promise<readerType>} - reader object
 */
async function queryReader({
  connection,
  query,
  queryType,
  systemConnection,
  driver,
  // obsolete; use query instead
  sql,
}) {
  // if (sql && json) {
  //   throw new Error('Only one of sql or json could be set');
  // }
  // if (!sql && !json) {
  //   throw new Error('One of sql or json must be set');
  // }
  logger.info({ sql: query || sql }, `DBGM-00061 Reading query`);
  // else console.log(`Reading query ${JSON.stringify(json)}`);

  if (!driver) {
    driver = requireEngineDriver(connection);
  }
  const dbhan = systemConnection || (await connectUtility(driver, connection, queryType == 'json' ? 'read' : 'script'));

  const reader =
    queryType == 'json' ? await driver.readJsonQuery(dbhan, query) : await driver.readQuery(dbhan, query || sql);
  return reader;
}

module.exports = queryReader;
