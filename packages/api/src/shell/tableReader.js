const { quoteFullName, fullNameToString } = require('dbgate-tools');
const requireEngineDriver = require('../utility/requireEngineDriver');
const connectUtility = require('../utility/connectUtility');

async function tableReader({ connection, pureName, schemaName }) {
  const driver = requireEngineDriver(connection);
  const pool = await connectUtility(driver, connection);
  console.log(`Connected.`);

  const fullName = { pureName, schemaName };

  if (driver.dialect.nosql) {
    // @ts-ignore
    console.log(`Reading collection ${fullNameToString(fullName)}`);
    // @ts-ignore
    return await driver.readQuery(pool, JSON.stringify(fullName));
  }

  const table = await driver.analyseSingleObject(pool, fullName, 'tables');
  const query = `select * from ${quoteFullName(driver.dialect, fullName)}`;
  if (table) {
    // @ts-ignore
    console.log(`Reading table ${fullNameToString(table)}`);
    // @ts-ignore
    return await driver.readQuery(pool, query, table);
  }
  const view = await driver.analyseSingleObject(pool, fullName, 'views');
  if (view) {
    // @ts-ignore
    console.log(`Reading view ${fullNameToString(view)}`);
    // @ts-ignore
    return await driver.readQuery(pool, query, view);
  }

  return await driver.readQuery(pool, query);
}

module.exports = tableReader;
