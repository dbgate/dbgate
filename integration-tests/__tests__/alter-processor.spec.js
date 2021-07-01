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
  await driver.query(conn, `create table t0 (id int not null primary key)`);

  await driver.query(
    conn,
    `create table t1 (
    id int not null primary key, 
    col_std int null, 
    col_def int null default 12,
    col_fk int null references t0(id),
    col_idx int null
  )`
  );

  await driver.query(conn, `create index idx1 on t1(col_idx)`);

  const tget = x => x.tables.find(y => y.pureName == 't1');
  const structure1 = generateDbPairingId(extendDatabaseInfo(await driver.analyseFull(conn)));
  let structure2 = _.cloneDeep(structure1);
  mangle(tget(structure2));
  structure2 = extendDatabaseInfo(structure2);

  const sql = getAlterTableScript(tget(structure1), tget(structure2), {}, structure2, driver);
  console.log('RUNNING ALTER SQL:', sql);

  await driver.query(conn, sql);

  const structure2Real = extendDatabaseInfo(await driver.analyseFull(conn));

  checkTableStructure(tget(structure2Real), tget(structure2));
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
    })
  );

  test.each(engines.map(engine => [engine.label, engine]))(
    'Drop column - %s',
    testWrapper(async (conn, driver, engine) => {
      await testTableDiff(conn, driver, tbl => (tbl.columns = tbl.columns.filter(x => x.columnName != 'col_std')));
    })
  );

  test.each(engines.map(engine => [engine.label, engine]))(
    'Drop column with default - %s',
    testWrapper(async (conn, driver, engine) => {
      await testTableDiff(conn, driver, tbl => (tbl.columns = tbl.columns.filter(x => x.columnName != 'col_def')));
    })
  );

  test.each(engines.map(engine => [engine.label, engine]))(
    'Drop column with fk - %s',
    testWrapper(async (conn, driver, engine) => {
      await testTableDiff(conn, driver, tbl => (tbl.columns = tbl.columns.filter(x => x.columnName != 'col_fk')));
    })
  );

  test.each(engines.map(engine => [engine.label, engine]))(
    'Drop column with index - %s',
    testWrapper(async (conn, driver, engine) => {
      await testTableDiff(conn, driver, tbl => (tbl.columns = tbl.columns.filter(x => x.columnName != 'col_idx')));
    })
  );

  test.each(engines.map(engine => [engine.label, engine]))(
    'Change nullability - %s',
    testWrapper(async (conn, driver, engine) => {
      await testTableDiff(
        conn,
        driver,
        tbl => (tbl.columns = tbl.columns.map(x => (x.columnName == 'col_std' ? { ...x, notNull: true } : x)))
      );
    })
  );
});
