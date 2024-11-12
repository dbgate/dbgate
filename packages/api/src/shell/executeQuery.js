const fs = require('fs-extra');
const requireEngineDriver = require('../utility/requireEngineDriver');
const connectUtility = require('../utility/connectUtility');
const { getLogger, getLimitedQuery } = require('dbgate-tools');

const logger = getLogger('execQuery');

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
    logger.info(`Connected.`);

    await driver.script(dbhan, sql, { logScriptItems });
  } finally {
    if (!systemConnection) {
      await driver.close(dbhan);
    }
  }
}

module.exports = executeQuery;
