const { quoteFullName, fullNameToString, getLogger } = require('dbgate-tools');
const requireEngineDriver = require('../utility/requireEngineDriver');
const connectUtility = require('../utility/connectUtility');
const logger = getLogger('tableReader');

async function tableReader({ connection, systemConnection, pureName, schemaName }) {
  const driver = requireEngineDriver(connection);
  const dbhan = systemConnection || (await connectUtility(driver, connection, 'read'));
  logger.info(`Connected.`);

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
