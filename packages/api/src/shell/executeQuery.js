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
 * @param {boolean} [options.useTransaction] - run query in transaction
 * @param {boolean} [options.skipLogging] - whether to skip logging
 */
async function executeQuery({
  connection = undefined,
  systemConnection = undefined,
  driver = undefined,
  sql,
  sqlFile = undefined,
  logScriptItems = false,
  skipLogging = false,
  useTransaction,
}) {
  if (!logScriptItems && !skipLogging) {
    logger.info({ sql: getLimitedQuery(sql) }, `DBGM-00048 Execute query`);
  }

  if (!driver) driver = requireEngineDriver(connection);
  const dbhan = systemConnection || (await connectUtility(driver, connection, 'script'));

  if (sqlFile) {
    logger.debug(`DBGM-00049 Loading SQL file ${sqlFile}`);
    sql = await fs.readFile(sqlFile, { encoding: 'utf-8' });
  }

  try {
    if (!skipLogging) {
      logger.debug(`DBGM-00050 Running SQL query, length: ${sql.length}`);
    }

    await driver.script(dbhan, sql, { logScriptItems, useTransaction });
  } finally {
    if (!systemConnection) {
      await driver.close(dbhan);
    }
  }
}

module.exports = executeQuery;
