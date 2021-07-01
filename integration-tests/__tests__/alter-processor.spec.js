const stableStringify = require('json-stable-stringify');
const _ = require('lodash');
const fp = require('lodash/fp');
const uuidv1 = require('uuid/v1');
const { testWrapper } = require('../tools');
const engines = require('../engines');
const { getAlterTableScript, extendDatabaseInfo, generateDbPairingId } = require('dbgate-tools');

function pickImportantTableInfo(table) {
  return {
    pureName: table.pureName,
    columns: table.columns.map(fp.pick(['columnName', 'notNull', 'autoIncrement'])),
  };
}

function checkTableStructure(t1, t2) {
  // expect(t1.pureName).toEqual(t2.pureName)
  expect(pickImportantTableInfo(t1)).toEqual(pickImportantTableInfo(t2));
}

async function testTableDiff(conn, driver, mangle) {
  await driver.query(conn, 'create table t1 (col1 int not null)');

  const structure1 = generateDbPairingId(extendDatabaseInfo(await driver.analyseFull(conn)));
  let structure2 = _.cloneDeep(structure1);
  mangle(structure2.tables[0]);
  structure2 = extendDatabaseInfo(structure2);

  const sql = getAlterTableScript(structure1.tables[0], structure2.tables[0], {}, structure2, driver);
  console.log('RUNNING ALTER SQL:', sql);

  await driver.query(conn, sql);

  const structure2Real = extendDatabaseInfo(await driver.analyseFull(conn));

  checkTableStructure(structure2Real.tables[0], structure2.tables[0]);
  // expect(stableStringify(structure2)).toEqual(stableStringify(structure2Real));
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
          notNull: false,
          autoIncrement: false,
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
