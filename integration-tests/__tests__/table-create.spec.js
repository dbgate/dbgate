const _ = require('lodash');
const fp = require('lodash/fp');
const engines = require('../engines');
const { testWrapper } = require('../tools');
const { extendDatabaseInfo, runCommandOnDriver } = require('dbgate-tools');

function createExpector(value) {
  return _.cloneDeepWith(value, x => {
    if (_.isPlainObject(x)) {
      return expect.objectContaining(_.mapValues(x, y => createExpector(y)));
    }
  });
}

function omitTableSpecificInfo(table) {
  return {
    ...table,
    columns: table.columns.map(fp.omit(['dataType'])),
  };
}

function checkTableStructure2(t1, t2) {
  // expect(t1.pureName).toEqual(t2.pureName)
  expect(t2).toEqual(createExpector(omitTableSpecificInfo(t1)));
}

async function testTableCreate(engine, conn, driver, table) {
  await runCommandOnDriver(conn, driver, dmp =>
    dmp.put(`create table ~t0 (~id int ${engine.skipNullability ? '' : 'not null'} primary key)`)
  );

  const dmp = driver.createDumper();
  const table1 = {
    ...table,
    pureName: 'tested',
  };
  dmp.createTable(table1);

  console.log('RUNNING CREATE SQL', driver.engine, ':', dmp.s);
  await driver.script(conn, dmp.s);

  const db = extendDatabaseInfo(await driver.analyseFull(conn));
  const table2 = db.tables.find(x => x.pureName == 'tested');

  checkTableStructure2(table1, table2);
}

describe('Table create', () => {
  test.each(engines.map(engine => [engine.label, engine]))(
    'Simple table - %s',
    testWrapper(async (conn, driver, engine) => {
      await testTableCreate(engine, conn, driver, {
        columns: [
          {
            columnName: 'col1',
            dataType: 'int',
            ...(engine.skipNullability ? {} : { notNull: true }),
          },
        ],
        primaryKey: {
          columns: [{ columnName: 'col1' }],
        },
      });
    })
  );

  test.each(engines.filter(x => !x.skipIndexes).map(engine => [engine.label, engine]))(
    'Table with index - %s',
    testWrapper(async (conn, driver, engine) => {
      await testTableCreate(engine, conn, driver, {
        columns: [
          {
            columnName: 'col1',
            dataType: 'int',
            notNull: true,
          },
          {
            columnName: 'col2',
            dataType: 'int',
            notNull: true,
          },
        ],
        primaryKey: {
          columns: [{ columnName: 'col1' }],
        },
        indexes: [
          {
            constraintName: 'ix1',
            pureName: 'tested',
            columns: [{ columnName: 'col2' }],
          },
        ],
      });
    })
  );

  test.each(engines.filter(x => !x.skipReferences).map(engine => [engine.label, engine]))(
    'Table with foreign key - %s',
    testWrapper(async (conn, driver, engine) => {
      await testTableCreate(engine, conn, driver, {
        columns: [
          {
            columnName: 'col1',
            dataType: 'int',
            notNull: true,
          },
          {
            columnName: 'col2',
            dataType: 'int',
            notNull: true,
          },
        ],
        primaryKey: {
          columns: [{ columnName: 'col1' }],
        },
        foreignKeys: [
          {
            pureName: 'tested',
            refTableName: 't0',
            columns: [{ columnName: 'col2', refColumnName: 'id' }],
          },
        ],
      });
    })
  );

  test.each(engines.filter(x => !x.skipUnique).map(engine => [engine.label, engine]))(
    'Table with unique - %s',
    testWrapper(async (conn, driver, engine) => {
      await testTableCreate(engine, conn, driver, {
        columns: [
          {
            columnName: 'col1',
            dataType: 'int',
            notNull: true,
          },
          {
            columnName: 'col2',
            dataType: 'int',
            notNull: true,
          },
        ],
        primaryKey: {
          columns: [{ columnName: 'col1' }],
        },
        uniques: [
          {
            pureName: 'tested',
            columns: [{ columnName: 'col2' }],
          },
        ],
      });
    })
  );
});
