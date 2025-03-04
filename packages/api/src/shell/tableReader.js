const { quoteFullName, fullNameToString, getLogger } = require('dbgate-tools');
const requireEngineDriver = require('../utility/requireEngineDriver');
const { connectUtility } = require('../utility/connectUtility');
const logger = getLogger('tableReader');

/**
 * Creates reader object for {@link copyStream} function. This reader object reads data from table or view.
 * @param {object} options
 * @param {connectionType} options.connection - connection object
 * @param {object} options.systemConnection - system connection (result of driver.connect). If not provided, new connection will be created
 * @param {object} options.driver - driver object. If not provided, it will be loaded from connection
 * @param {string} options.pureName - table name
 * @param {string} options.schemaName - schema name
 * @returns {Promise<readerType>} - reader object
 */
async function tableReader({ connection, systemConnection, pureName, schemaName, driver }) {
  if (!driver) {
    driver = requireEngineDriver(connection);
  }
  const dbhan = systemConnection || (await connectUtility(driver, connection, 'read'));

  const fullName = { pureName, schemaName };

  if (driver.databaseEngineTypes.includes('document')) {
    // @ts-ignore
    logger.info(`Reading collection ${fullNameToString(fullName)}`);
    // @ts-ignore
    return await driver.readQuery(dbhan, JSON.stringify(fullName));
  }

  const table = await driver.analyseSingleObject(dbhan, fullName, 'tables');
  const query = `select * from ${quoteFullName(driver.dialect, fullName)}`;
  if (table) {
    // @ts-ignore
    logger.info(`Reading table ${fullNameToString(table)}`);
    // @ts-ignore
    return await driver.readQuery(dbhan, query, table);
  }
  const view = await driver.analyseSingleObject(dbhan, fullName, 'views');
  if (view) {
    // @ts-ignore
    logger.info(`Reading view ${fullNameToString(view)}`);
    // @ts-ignore
    return await driver.readQuery(dbhan, query, view);
  }

  return await driver.readQuery(dbhan, query);
}

module.exports = tableReader;
