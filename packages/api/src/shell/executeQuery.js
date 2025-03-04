const fs = require('fs-extra');
const requireEngineDriver = require('../utility/requireEngineDriver');
const { connectUtility } = require('../utility/connectUtility');
const { getLogger, getLimitedQuery } = require('dbgate-tools');

const logger = getLogger('execQuery');

/**
 * Executes SQL query
 * @param {object} options
 * @param {connectionType} [options.connection] - connection object
 * @param {object} [options.systemConnection] - system connection (result of driver.connect). If not provided, new connection will be created
 * @param {object} [options.driver] - driver object. If not provided, it will be loaded from connection
 * @param {string} [options.sql] - SQL query
 * @param {string} [options.sqlFile] - SQL file
 * @param {boolean} [options.logScriptItems] - whether to log script items instead of whole script
 */
async function executeQuery({
  connection = undefined,
  systemConnection = undefined,
  driver = undefined,
  sql,
  sqlFile = undefined,
  logScriptItems = false,
}) {
  if (!logScriptItems) {
    logger.info({ sql: getLimitedQuery(sql) }, `Execute query`);
  }

  if (!driver) driver = requireEngineDriver(connection);
  const dbhan = systemConnection || (await connectUtility(driver, connection, 'script'));

  if (sqlFile) {
    logger.debug(`Loading SQL file ${sqlFile}`);
    sql = await fs.readFile(sqlFile, { encoding: 'utf-8' });
  }

  try {
    logger.debug(`Running SQL query, length: ${sql.length}`);

    await driver.script(dbhan, sql, { logScriptItems });
  } finally {
    if (!systemConnection) {
      await driver.close(dbhan);
    }
  }
}

module.exports = executeQuery;
