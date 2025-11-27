const stableStringify = require('json-stable-stringify');
const _ = require('lodash');
const fp = require('lodash/fp');
const { testWrapper, removeNotNull, transformSqlForEngine } = require('../tools');
const engines = require('../engines');
const crypto = require('crypto');
const {
  getAlterTableScript,
  extendDatabaseInfo,
  generateDbPairingId,
  formatQueryWithoutParams,
} = require('dbgate-tools');

function pickImportantTableInfo(engine, table) {
  if (!table) return table;
  const props = ['columnName', 'defaultValue'];
  if (!engine.skipNullability) props.push('notNull');
  if (!engine.skipAutoIncrement) props.push('autoIncrement');
  return {
    pureName: table.pureName,
    columns: table.columns
      .filter(x => x.columnName != 'rowid')
      .sort((a, b) => a.columnName.localeCompare(b.columnName))
      .map(fp.pick(props))
      .map(props => _.omitBy(props, x => x == null))
      .map(props =>
        _.omitBy(props, (v, k) => k == 'defaultValue' && v == 'NULL' && engine.setNullDefaultInsteadOfDrop)
      ),
    foreignKeys: table.foreignKeys
      .sort((a, b) => a.refTableName.localeCompare(b.refTableName))
      .map(fk => ({
        constraintType: fk.constraintType,
        refTableName: fk.refTableName,
        columns: fk.columns.map(col => ({ columnName: col.columnName, refColumnName: col.refColumnName })),
      })),
  };
}

function checkTableStructure(engine, t1, t2) {
  // expect(t1.pureName).toEqual(t2.pureName)
  expect(pickImportantTableInfo(engine, t1)).toEqual(pickImportantTableInfo(engine, t2));
}

async function testTableDiff(engine, conn, driver, mangle, changedTable = 't1') {
  const initQuery = formatQueryWithoutParams(driver, `create table ~t0 (~id int not null primary key)`);
  await driver.query(conn, transformSqlForEngine(engine, initQuery));

  const query = formatQueryWithoutParams(
    driver,
    `create table ~t1 (
    ~col_pk int not null primary key, 
    ~col_std int, 
    ~col_def int ${engine.skipDefaultValue ? '' : 'default 12'},
    ${engine.skipReferences ? '' : '~col_fk int references ~t0(~id),'}
    ~col_idx int,
    ~col_uq int ${engine.skipUnique ? '' : 'unique'} ,
    ~col_ref int ${engine.skipUnique ? '' : 'unique'}
  )`
  );

  await driver.query(conn, transformSqlForEngine(engine, query));

  if (!engine.skipIndexes) {
    const query = formatQueryWithoutParams(driver, `create index ~idx1 on ~t1(~col_idx)`);
    await driver.query(conn, transformSqlForEngine(engine, query));
  }

  if (!engine.skipReferences) {
    const query = formatQueryWithoutParams(
      driver,
      `create table ~t2 (~id int not null primary key, ~fkval int ${
        driver.dialect.implicitNullDeclaration ? '' : 'null'
      } references ~t1(~col_ref))`
    );

    await driver.query(conn, transformSqlForEngine(engine, query));
  }

  if (!engine.skipReferences) {
    const query = formatQueryWithoutParams(
      driver,
      `create table ~t3 (~id int not null primary key, ~fkval int ${
        driver.dialect.implicitNullDeclaration ? '' : 'null'
      })`
    );

    await driver.query(conn, transformSqlForEngine(engine, query));
  }

  const tget = x => x?.tables?.find(y => y.pureName == changedTable);
  const structure1Source = await driver.analyseFull(conn);
  const structure1 = generateDbPairingId(extendDatabaseInfo(structure1Source));
  let structure2 = _.cloneDeep(structure1);
  mangle(tget(structure2));
  structure2 = extendDatabaseInfo(structure2);

  const { sql } = getAlterTableScript(tget(structure1), tget(structure2), {}, structure1, structure2, driver);

  // sleep 1s - some engines have update datetime precision only to seconds
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('RUNNING ALTER SQL', driver.engine, ':', sql);

  await driver.script(conn, sql);

  if (!engine.skipIncrementalAnalysis) {
    const structure2RealIncremental = await driver.analyseIncremental(conn, structure1Source);
    checkTableStructure(engine, tget(structure2RealIncremental), tget(structure2));
  }

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

function createEnginesColumnsSource(engines) {
  return _.flatten(
    engines.map(engine =>
      TESTED_COLUMNS.filter(col => col.endsWith('_pk') || !engine.skipNonPkRename)
        .filter(col => !col.endsWith('_pk') || !engine.skipPkColumnTesting)
        .map(column => [engine.label, column, engine])
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

  test.each(engines.filter(i => i.supportTableComments).map(engine => [engine.label, engine]))(
    'Add comment to table - %s',
    testWrapper(async (conn, driver, engine) => {
      await testTableDiff(engine, conn, driver, tbl => {
        tbl.objectComment = 'Added table comment';
      });
    })
  );

  test.each(engines.filter(i => i.supportColumnComments).map(engine => [engine.label, engine]))(
    'Add comment to column - %s',
    testWrapper(async (conn, driver, engine) => {
      await testTableDiff(engine, conn, driver, tbl => {
        tbl.columns.push({
          columnName: 'added',
          columnComment: 'Added column comment',
          dataType: 'int',
          pairingId: crypto.randomUUID(),
          notNull: false,
          autoIncrement: false,
        });
      });
    })
  );

  test.each(
    createEnginesColumnsSource(engines.filter(x => !x.skipDropColumn)).filter(
      ([_label, col, engine]) => !engine.skipPkDrop || !col.endsWith('_pk')
    )
  )(
    'Drop column - %s - %s',
    testWrapper(async (conn, driver, column, engine) => {
      await testTableDiff(engine, conn, driver, tbl => (tbl.columns = tbl.columns.filter(x => x.columnName != column)));
    })
  );

  test.each(createEnginesColumnsSource(engines.filter(x => !x.skipNullable && !x.skipChangeNullability)))(
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

  test.each(createEnginesColumnsSource(engines.filter(x => !x.skipRenameColumn)))(
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

  test.each(engines.filter(x => !x.skipDefaultValue).map(engine => [engine.label, engine]))(
    'Add default value - %s',
    testWrapper(async (conn, driver, engine) => {
      await testTableDiff(engine, conn, driver, tbl => {
        tbl.columns.find(x => x.columnName == 'col_std').defaultValue = '123';
      });
    })
  );

  test.each(engines.filter(x => !x.skipDefaultValue).map(engine => [engine.label, engine]))(
    'Unset default value - %s',
    testWrapper(async (conn, driver, engine) => {
      await testTableDiff(engine, conn, driver, tbl => {
        tbl.columns.find(x => x.columnName == 'col_def').defaultValue = undefined;
      });
    })
  );

  test.each(engines.filter(x => !x.skipDefaultValue).map(engine => [engine.label, engine]))(
    'Change default value - %s',
    testWrapper(async (conn, driver, engine) => {
      await testTableDiff(engine, conn, driver, tbl => {
        tbl.columns.find(x => x.columnName == 'col_def').defaultValue = '567';
      });
    })
  );

  test.each(engines.filter(x => !x.skipReferences).map(engine => [engine.label, engine]))(
    'Drop FK - %s',
    testWrapper(async (conn, driver, engine) => {
      await testTableDiff(
        engine,
        conn,
        driver,
        tbl => {
          tbl.foreignKeys = [];
        },
        't2'
      );
    })
  );

  test.each(engines.filter(x => !x.skipReferences).map(engine => [engine.label, engine]))(
    'Create FK - %s',
    testWrapper(async (conn, driver, engine) => {
      await testTableDiff(
        engine,
        conn,
        driver,
        tbl => {
          tbl.foreignKeys = [
            {
              constraintType: 'foreignKey',
              pureName: 't2',
              refTableName: 't1',
              columns: [
                {
                  columnName: 'fkval',
                  refColumnName: 'col_ref',
                },
              ],
            },
          ];
        },
        't3'
      );
    })
  );

  // test.each(engines.map(engine => [engine.label, engine]))(
  //   'Change autoincrement - %s',
  //   testWrapper(async (conn, driver, engine) => {
  //     await testTableDiff(engine, conn, driver, tbl => {
  //       tbl.columns.find(x => x.columnName == 'col_pk').autoIncrement = true;
  //     });
  //   })
  // );
});
