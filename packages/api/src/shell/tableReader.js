const { quoteFullName } = require('@dbgate/tools');
const driverConnect = require('../utility/driverConnect');

const engines = require('@dbgate/engines');

async function queryReader({ connection, pureName, schemaName }) {
  const driver = engines(connection);
  const pool = await driverConnect(driver, connection);
  console.log(`Connected.`);

  const fullName = { pureName, schemaName };

  const table = await driver.analyseSingleObject(pool, fullName, 'tables');
  const query = `select * from ${quoteFullName(driver.dialect, fullName)}`;
  if (table) {
    console.log(`Reading table ${table.pureName}`);
    return await driver.readQuery(pool, query, table);
  }
  const view = await driver.analyseSingleObject(pool, fullName, 'views');
  if (view) {
    console.log(`Reading view ${view.pureName}`);
    return await driver.readQuery(pool, query, view);
  }

  return await driver.readQuery(pool, query);
}

module.exports = queryReader;
