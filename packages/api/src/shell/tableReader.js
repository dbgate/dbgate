const { quoteFullName } = require('dbgate-tools');
const requireEngineDriver = require('../utility/requireEngineDriver');

async function tableReader({ connection, pureName, schemaName }) {
  const driver = requireEngineDriver(connection);
  const pool = await driver.connect(connection);
  console.log(`Connected.`);

  const fullName = { pureName, schemaName };

  const table = await driver.analyseSingleObject(pool, fullName, 'tables');
  const query = `select * from ${quoteFullName(driver.dialect, fullName)}`;
  if (table) {
    console.log(`Reading table ${table.pureName}`);
    // @ts-ignore
    return await driver.readQuery(pool, query, table);
  }
  const view = await driver.analyseSingleObject(pool, fullName, 'views');
  if (view) {
    console.log(`Reading view ${view.pureName}`);
    // @ts-ignore
    return await driver.readQuery(pool, query, view);
  }

  return await driver.readQuery(pool, query);
}

module.exports = tableReader;
