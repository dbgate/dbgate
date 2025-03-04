const executeQuery = require('./executeQuery');
const requireEngineDriver = require('../utility/requireEngineDriver');
const { connectUtility } = require('../utility/connectUtility');
const { getLogger, extendDatabaseInfo } = require('dbgate-tools');

const logger = getLogger('dropAllDbObjects');

/**
 * Drops all database objects
 * @param {object} options
 * @param {connectionType} options.connection - connection object
 * @param {object} options.systemConnection - system connection (result of driver.connect). If not provided, new connection will be created
 * @param {object} options.driver - driver object. If not provided, it will be loaded from connection
 * @param {object} options.analysedStructure - analysed structure of the database. If not provided, it will be loaded
 * @returns {Promise}
 */
async function dropAllDbObjects({ connection, systemConnection, driver, analysedStructure }) {
  if (!driver) driver = requireEngineDriver(connection);

  const dbhan = systemConnection || (await connectUtility(driver, connection, 'write'));

  if (!analysedStructure) {
    analysedStructure = await driver.analyseFull(dbhan);
  }

  analysedStructure = extendDatabaseInfo(analysedStructure);

  const dmp = driver.createDumper();

  for (const table of analysedStructure.tables) {
    for (const fk of table.foreignKeys) {
      dmp.dropForeignKey(fk);
    }
  }
  for (const table of analysedStructure.tables) {
    dmp.dropTable(table);
  }
  for (const field of Object.keys(analysedStructure)) {
    if (dmp.getSqlObjectSqlName(field)) {
      for (const obj of analysedStructure[field]) {
        dmp.dropSqlObject(obj);
      }
    }
  }

  await executeQuery({ connection, systemConnection, driver, sql: dmp.s, logScriptItems: true });
}

module.exports = dropAllDbObjects;
