const stableStringify = require('json-stable-stringify');
const _ = require('lodash');
const fp = require('lodash/fp');
const { testWrapper } = require('../tools');
const engines = require('../engines');
const crypto = require('crypto');
const { getAlterTableScript, extendDatabaseInfo, generateDbPairingId } = require('dbgate-tools');

function pickImportantTableInfo(engine, table) {
  const props = ['columnName'];
  if (!engine.skipNullability) props.push('notNull');
  if (!engine.skipAutoIncrement) props.push('autoIncrement');
  return {
    pureName: table.pureName,
    columns: table.columns.filter(x => x.columnName != 'rowid').map(fp.pick(props)),
  };
}

function checkTableStructure(engine, t1, t2) {
  // expect(t1.pureName).toEqual(t2.pureName)
  expect(pickImportantTableInfo(engine, t1)).toEqual(pickImportantTableInfo(engine, t2));
}

async function testTableDiff(engine, conn, driver, mangle) {
  await driver.query(conn, `create table t0 (id int not null primary key)`);

  await driver.query(
    conn,
    `create table t1 (
    col_pk int not null primary key, 
    col_std int, 
    col_def int default 12,
    ${engine.skipReferences ? '' : 'col_fk int references t0(id),'}
    col_idx int,
    col_uq int ${engine.skipUnique ? '' : 'unique'} ,
    col_ref int ${engine.skipUnique ? '' : 'unique'}
  )`
  );

  if (!engine.skipIndexes) {
    await driver.query(conn, `create index idx1 on t1(col_idx)`);
  }

  if (!engine.skipReferences) {
    await driver.query(conn, `create table t2 (id int not null primary key, fkval int null references t1(col_ref))`);
  }

  const tget = x => x.tables.find(y => y.pureName == 't1');
  const structure1 = generateDbPairingId(extendDatabaseInfo(await driver.analyseFull(conn)));
  let structure2 = _.cloneDeep(structure1);
  mangle(tget(structure2));
  structure2 = extendDatabaseInfo(structure2);

  const { sql } = getAlterTableScript(tget(structure1), tget(structure2), {}, structure1, structure2, driver);
  console.log('RUNNING ALTER SQL', driver.engine, ':', sql);

  await driver.script(conn, sql);

  const structure2Real = extendDatabaseInfo(await driver.analyseFull(conn));

  checkTableStructure(engine, tget(structure2Real), tget(structure2));
  // expect(stableStringify(structure2)).toEqual(stableStringify(structure2Real));
}

const TESTED_COLUMNS = ['col_pk', 'col_std', 'col_def', 'col_fk', 'col_ref', 'col_idx', 'col_uq'];
// const TESTED_COLUMNS = ['col_pk'];
// const TESTED_COLUMNS = ['col_idx'];
// const TESTED_COLUMNS = ['col_def'];
// const TESTED_COLUMNS = ['col_std'];
// const TESTED_COLUMNS = ['col_ref'];

function engines_columns_source() {
  return _.flatten(
    engines.map(engine =>
      TESTED_COLUMNS.filter(col => !col.endsWith('_pk') || !engine.skipPkColumnTesting).map(column => [
        engine.label,
        column,
        engine,
      ])
    )
  );
}

describe('Alter table', () => {
  test.each(engines.map(engine => [engine.label, engine]))(
    'Add column - %s',
    testWrapper(async (conn, driver, engine) => {
      await testTableDiff(engine, conn, driver, tbl => {
        tbl.columns.push({
          columnName: 'added',
          dataType: 'int',
          pairingId: crypto.randomUUID(),
          notNull: false,
          autoIncrement: false,
        });
      });
    })
  );

  test.each(engines_columns_source())(
    'Drop column - %s - %s',
    testWrapper(async (conn, driver, column, engine) => {
      await testTableDiff(engine, conn, driver, tbl => (tbl.columns = tbl.columns.filter(x => x.columnName != column)));
    })
  );

  test.each(engines_columns_source())(
    'Change nullability - %s - %s',
    testWrapper(async (conn, driver, column, engine) => {
      await testTableDiff(
        engine,
        conn,
        driver,
        tbl => (tbl.columns = tbl.columns.map(x => (x.columnName == column ? { ...x, notNull: true } : x)))
      );
    })
  );

  test.each(engines_columns_source())(
    'Rename column - %s - %s',
    testWrapper(async (conn, driver, column, engine) => {
      await testTableDiff(
        engine,
        conn,
        driver,
        tbl => (tbl.columns = tbl.columns.map(x => (x.columnName == column ? { ...x, columnName: 'col_renamed' } : x)))
      );
    })
  );

  test.each(engines.map(engine => [engine.label, engine]))(
    'Drop index - %s',
    testWrapper(async (conn, driver, engine) => {
      await testTableDiff(engine, conn, driver, tbl => {
        tbl.indexes = [];
      });
    })
  );

  test.each(engines.map(engine => [engine.label, engine]))(
    'Add default value - %s',
    testWrapper(async (conn, driver, engine) => {
      await testTableDiff(engine, conn, driver, tbl => {
        tbl.columns.find(x => x.columnName == 'col_std').defaultValue = 123;
      });
    })
  );

  test.each(engines.map(engine => [engine.label, engine]))(
    'Unset default value - %s',
    testWrapper(async (conn, driver, engine) => {
      await testTableDiff(engine, conn, driver, tbl => {
        tbl.columns.find(x => x.columnName == 'col_def').defaultValue = undefined;
      });
    })
  );

  test.each(engines.map(engine => [engine.label, engine]))(
    'Change default value - %s',
    testWrapper(async (conn, driver, engine) => {
      await testTableDiff(engine, conn, driver, tbl => {
        tbl.columns.find(x => x.columnName == 'col_def').defaultValue = 567;
      });
    })
  );
});
