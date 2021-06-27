const engines = require('../engines');
const uuidv1 = require('uuid/v1');
const { testWrapper } = require('../tools');

async function testTableDiff(conn, driver, mangle) {
  await driver.query(conn, 'create table t1 (col1 int not null)');

  const structure1 = await driver.analyseFull(conn);
  mangle(structure1.tables[0]);
}

describe('Alter processor', () => {
  test.each(engines.map(engine => [engine.label, engine]))(
    'Add column - %s',
    testWrapper(async (conn, driver, engine) => {
      testTableDiff(conn, driver, tbl =>
        tbl.columns.push({
          columnName: 'added',
          dataType: 'int',
          pairingId: uuidv1(),
        })
      );
      // console.log('ENGINE', engine);
      // for (const sql of initSql) await driver.query(conn, sql);

      // await driver.query(conn, object.create1);
      // const structure = await driver.analyseFull(conn);

      // expect(structure[type].length).toEqual(1);
      // expect(structure[type][0]).toEqual(type.includes('views') ? view1Match : obj1Match);
    })
  );
});
