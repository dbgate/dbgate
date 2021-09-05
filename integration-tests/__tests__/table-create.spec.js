const engines = require('../engines');
const { testWrapper, checkTableStructure } = require('../tools');
const { extendDatabaseInfo } = require('dbgate-tools');

async function testTableCreate(conn, driver, table) {
  const dmp = driver.createDumper();
  const table1 = {
    ...table,
    pureName: 'tested',
  };
  dmp.createTable(table1);

  console.log('RUNNING CREATE SQL', driver.engine, ':', dmp.s);
  await driver.query(conn, dmp.s);

  const db = extendDatabaseInfo(await driver.analyseFull(conn));
  const table2 = db.tables.find(x => x.pureName == 'tested');

  checkTableStructure(table1, table2);
}

describe('Table create', () => {
  test.each(engines.map(engine => [engine.label, engine]))(
    'Table structure - full analysis - %s',
    testWrapper(async (conn, driver, engine) => {
      await testTableCreate(conn, driver, {
        columns: [
          {
            columnName: 'col1',
            dataType: 'int',
            notNull: true,
            autoIncrement: false,
          },
        ],
        primaryKey: {
          columns: [{ columnName: 'col1' }],
        },
      });
    })
  );
});
