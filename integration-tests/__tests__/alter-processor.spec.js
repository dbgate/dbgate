const stableStringify = require('json-stable-stringify');
const _ = require('lodash');
const uuidv1 = require('uuid/v1');
const { testWrapper } = require('../tools');
const engines = require('../engines');
const { getAlterTableScript, extendDatabaseInfo } = require('dbgate-tools');

async function testTableDiff(conn, driver, mangle) {
  await driver.query(conn, 'create table t1 (col1 int not null)');

  const structure1 = extendDatabaseInfo(await driver.analyseFull(conn));
  let structure2 = _.cloneDeep(structure1);
  mangle(structure2.tables[0]);
  structure2 = extendDatabaseInfo(structure2);

  const sql = getAlterTableScript(structure1.tables[0], structure2.tables[0], {}, structure2, driver);
  console.log('RUNNING ALTER SQL:', sql);

  await driver.query(conn, sql);

  const structure2Real = extendDatabaseInfo(await driver.analyseFull(conn));

  expect(stableStringify(structure2)).toEqual(stableStringify(structure2Real));
}

describe('Alter processor', () => {
  test.each(engines.map(engine => [engine.label, engine]))(
    'Add column - %s',
    testWrapper(async (conn, driver, engine) => {
      await testTableDiff(conn, driver, tbl =>
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
