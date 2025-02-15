/// TODO

const { testWrapper, testWrapperPrepareOnly } = require('../tools');
const _ = require('lodash');
const engines = require('../engines');
const deployDb = require('dbgate-api/src/shell/deployDb');
const { databaseInfoFromYamlModel, runQueryOnDriver, formatQueryWithoutParams } = require('dbgate-tools');
const generateDeploySql = require('dbgate-api/src/shell/generateDeploySql');
const { connectUtility } = require('dbgate-api/src/utility/connectUtility');

function checkStructure(
  engine,
  structure,
  model,
  { checkRenameDeletedObjects = false, disallowExtraObjects = false } = {}
) {
  const expected = databaseInfoFromYamlModel(model);

  for (const expectedTable of expected.tables) {
    const realTable = structure.tables.find(x => x.pureName == expectedTable.pureName);

    for (const column of expectedTable.columns) {
      const realColumn = realTable.columns.find(x => x.columnName == column.columnName);
      expect(realColumn).toBeTruthy();
      if (!engine.skipNullability) {
        expect(realColumn.notNull).toEqual(column.notNull);
      }
    }

    for (const realColumn of realTable.columns) {
      const column = expectedTable.columns.find(x => x.columnName == realColumn.columnName);
      if (!column) {
        if (checkRenameDeletedObjects) {
          expect(realColumn.columnName).toMatch(/^_deleted_/);
        }

        if (disallowExtraObjects) {
          expect(realColumn).toBeFalsy();
        }
      }
    }
  }

  for (const realTable of structure.tables) {
    const expectedTable = expected.tables.find(x => x.pureName == realTable.pureName);
    if (!expectedTable) {
      if (checkRenameDeletedObjects) {
        expect(realTable.pureName).toMatch(/^_deleted_/);
      }

      if (disallowExtraObjects) {
        expect(realTable).toBeFalsy();
      }
    }
  }

  for (const expectedView of expected.views) {
    const realView = structure.views.find(x => x.pureName == expectedView.pureName);
    expect(realView).toBeTruthy();
  }

  for (const realView of structure.views) {
    const expectedView = expected.views.find(x => x.pureName == realView.pureName);
    if (!expectedView) {
      if (disallowExtraObjects) {
        expect(realView).toBeFalsy();
      }
    }
  }
}

// function convertObjectText(text, driver) {
//   if (!text) return undefined;
//   text = formatQueryWithoutParams(driver, text);
//   if (driver.dialect.requireFromDual && text.startsWith('create view ') && !text.includes('from')) {
//     text = text + ' from dual';
//   }
//   return text;
// }

// function convertModelToEngine(model, driver) {
//   return model.map(x => ({
//     ...x,
//     text: convertObjectText(x.text, driver),
//   }));
// }

function convertModelToEngine(model, driver) {
  return model.map(x => ({
    ...x,
    text: x.text ? formatQueryWithoutParams(driver, x.text) : undefined,
  }));
}

async function testDatabaseDeploy(engine, conn, driver, dbModelsYaml, options) {
  const { testEmptyLastScript, finalCheckAgainstModel, markDeleted, allowDropStatements } = options || {};
  let index = 0;
  const dbdiffOptionsExtra = markDeleted
    ? {
        deletedTablePrefix: '_deleted_',
        deletedColumnPrefix: '_deleted_',
        deletedSqlObjectPrefix: '_deleted_',
      }
    : {};
  dbdiffOptionsExtra.schemaMode = 'ignore';

  for (const loadedDbModel of dbModelsYaml) {
    if (_.isString(loadedDbModel)) {
      await driver.script(conn, formatQueryWithoutParams(driver, loadedDbModel));
    } else {
      const { sql, isEmpty } = await generateDeploySql({
        systemConnection: conn.isPreparedOnly ? undefined : conn,
        connection: conn.isPreparedOnly ? conn : undefined,
        driver,
        loadedDbModel: convertModelToEngine(loadedDbModel, driver),
        dbdiffOptionsExtra,
      });
      console.debug('Generated deploy script:', sql);
      if (!allowDropStatements) {
        expect(sql.toUpperCase().includes('DROP ')).toBeFalsy();
      }

      console.log('dbModelsYaml.length', dbModelsYaml.length, index);
      if (testEmptyLastScript && index == dbModelsYaml.length - 1) {
        expect(isEmpty).toBeTruthy();
      }

      await deployDb({
        systemConnection: conn.isPreparedOnly ? undefined : conn,
        connection: conn.isPreparedOnly ? conn : undefined,
        driver,
        loadedDbModel: convertModelToEngine(loadedDbModel, driver),
        dbdiffOptionsExtra,
      });
    }

    index++;
  }

  const dbhan = conn.isPreparedOnly ? await connectUtility(driver, conn, 'read') : conn;
  const structure = await driver.analyseFull(dbhan);
  if (conn.isPreparedOnly) await driver.close(dbhan);
  checkStructure(
    engine,
    structure,
    convertModelToEngine(finalCheckAgainstModel ?? _.findLast(dbModelsYaml, x => _.isArray(x)), driver),
    options
  );
}

describe('Deploy database', () => {
  test.each(engines.filter(i => !i.skipDeploy).map(engine => [engine.label, engine]))(
    'Deploy database simple - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDeploy(engine, conn, driver, [
        [
          {
            name: 't1.table.yaml',
            json: {
              name: 't1',
              columns: [{ name: 'id', type: 'int' }],
              primaryKey: ['id'],
            },
          },
        ],
      ]);
    })
  );

  test.each(engines.filter(i => !i.skipDeploy).map(engine => [engine.label, engine]))(
    'Deploy database simple - %s - not connected',
    testWrapperPrepareOnly(async (conn, driver, engine) => {
      await testDatabaseDeploy(engine, conn, driver, [
        [
          {
            name: 't1.table.yaml',
            json: {
              name: 't1',
              columns: [{ name: 'id', type: 'int' }],
              primaryKey: ['id'],
            },
          },
        ],
      ]);
    })
  );

  test.each(engines.filter(i => !i.skipDeploy).map(engine => [engine.label, engine]))(
    'Deploy database simple twice - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDeploy(
        engine,
        conn,
        driver,
        [
          [
            {
              name: 't1.table.yaml',
              json: {
                name: 't1',
                columns: [{ name: 'id', type: 'int' }],
                primaryKey: ['id'],
              },
            },
          ],
          [
            {
              name: 't1.table.yaml',
              json: {
                name: 't1',
                columns: [{ name: 'id', type: 'int' }],
                primaryKey: ['id'],
              },
            },
          ],
        ],
        { testEmptyLastScript: true }
      );
    })
  );

  test.each(engines.filter(i => !i.skipDeploy).map(engine => [engine.label, engine]))(
    'Add column - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDeploy(engine, conn, driver, [
        [
          {
            name: 't1.table.yaml',
            json: {
              name: 't1',
              columns: [{ name: 'id', type: 'int' }],
              primaryKey: ['id'],
            },
          },
        ],
        [
          {
            name: 't1.table.yaml',
            json: {
              name: 't1',
              columns: [
                { name: 'id', type: 'int' },
                { name: 'val', type: 'int' },
              ],
              primaryKey: ['id'],
            },
          },
        ],
      ]);
    })
  );

  test.each(engines.filter(i => !i.skipDeploy).map(engine => [engine.label, engine]))(
    'Dont drop column - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDeploy(
        engine,
        conn,
        driver,
        [
          [
            {
              name: 't1.table.yaml',
              json: {
                name: 't1',
                columns: [
                  { name: 'id', type: 'int' },
                  { name: 'val', type: 'int' },
                ],
                primaryKey: ['id'],
              },
            },
          ],
          [
            {
              name: 't1.table.yaml',
              json: {
                name: 't1',
                columns: [{ name: 'id', type: 'int' }],
                primaryKey: ['id'],
              },
            },
          ],
        ],
        { testEmptyLastScript: true }
      );
    })
  );

  test.each(
    engines
      .filter(i => !i.skipDeploy)
      .filter(x => !x.skipReferences)
      .map(engine => [engine.label, engine])
  )(
    'Foreign keys - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDeploy(
        engine,
        conn,
        driver,
        [
          [
            {
              name: 't2.table.yaml',
              json: {
                name: 't2',
                columns: [
                  { name: 't2id', type: 'int' },
                  { name: 't1id', type: 'int', references: 't1' },
                ],
                primaryKey: ['t2id'],
              },
            },
            {
              name: 't1.table.yaml',
              json: {
                name: 't1',
                columns: [{ name: 't1id', type: 'int' }],
                primaryKey: ['t1id'],
              },
            },
          ],
          [
            {
              name: 't2.table.yaml',
              json: {
                name: 't2',
                columns: [
                  { name: 't2id', type: 'int' },
                  { name: 't1id', type: 'int', references: 't1' },
                ],
                primaryKey: ['t2id'],
              },
            },
            {
              name: 't1.table.yaml',
              json: {
                name: 't1',
                columns: [{ name: 't1id', type: 'int' }],
                primaryKey: ['t1id'],
              },
            },
          ],
        ],
        { testEmptyLastScript: true }
      );
    })
  );

  test.each(
    engines
      .filter(i => !i.skipDeploy)
      .filter(x => !x.skipDataModifications)
      .map(engine => [engine.label, engine])
  )(
    'Deploy preloaded data - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDeploy(engine, conn, driver, [
        [
          {
            name: 't1.table.yaml',
            json: {
              name: 't1',
              columns: [
                { name: 'id', type: 'int' },
                { name: 'value', type: 'int' },
              ],
              primaryKey: ['id'],
              data: [
                { id: 1, value: 1 },
                { id: 2, value: 2 },
                { id: 3, value: 3 },
              ],
            },
          },
        ],
      ]);

      const res = await runQueryOnDriver(conn, driver, `select count(*) as ~cnt from ~t1`);
      expect(res.rows[0].cnt.toString()).toEqual('3');
    })
  );

  test.each(
    engines
      .filter(i => !i.skipDeploy)
      .filter(x => !x.skipDataModifications)
      .map(engine => [engine.label, engine])
  )(
    'Deploy preloaded data - update - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDeploy(engine, conn, driver, [
        [
          {
            name: 't1.table.yaml',
            json: {
              name: 't1',
              columns: [
                { name: 'id', type: 'int' },
                { name: 'val', type: 'int' },
              ],
              primaryKey: ['id'],
              data: [
                { id: 1, val: 1 },
                { id: 2, val: 2 },
                { id: 3, val: 3 },
              ],
            },
          },
        ],
        [
          {
            name: 't1.table.yaml',
            json: {
              name: 't1',
              columns: [
                { name: 'id', type: 'int' },
                { name: 'val', type: 'int' },
              ],
              primaryKey: ['id'],
              data: [
                { id: 1, val: 1 },
                { id: 2, val: 5 },
                { id: 3, val: 3 },
              ],
            },
          },
        ],
      ]);

      const res = await runQueryOnDriver(conn, driver, `select ~val from ~t1 where ~id = 2`);
      expect(res.rows[0].val.toString()).toEqual('5');
    })
  );

  test.each([engines.postgreSqlEngine].map(engine => [engine.label, engine]))(
    'Current timestamp default value - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDeploy(engine, conn, driver, [
        [
          {
            name: 't1.table.yaml',
            json: {
              name: 't1',
              columns: [
                { name: 'id', type: 'int' },
                {
                  name: 'val',
                  type: 'timestamp',
                  default: 'current_timestamp',
                },
              ],
              primaryKey: ['id'],
            },
          },
        ],
      ]);

      await runQueryOnDriver(conn, driver, `insert into ~t1 (~id) values (1)`);
      const res = await runQueryOnDriver(conn, driver, ` select ~val from ~t1 where ~id = 1`);
      expect(res.rows[0].val.toString().substring(0, 2)).toEqual('20');
    })
  );

  test.each(
    engines
      .filter(i => !i.skipDeploy)
      .filter(x => !x.skipChangeColumn && !x.skipNullability)
      .map(engine => [engine.label, engine])
  )(
    'Change column to NOT NULL column with default - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDeploy(engine, conn, driver, [
        [
          {
            name: 't1.table.yaml',
            json: {
              name: 't1',
              columns: [
                { name: 'id', type: 'int', notNull: true },
                { name: 'val', type: 'int' },
              ],

              primaryKey: ['id'],
            },
          },
        ],
        'insert into ~t1 (~id, ~val) values (1, 1); insert into ~t1 (~id) values (2)',
        [
          {
            name: 't1.table.yaml',
            json: {
              name: 't1',
              columns: [
                { name: 'id', type: 'int', notNull: true },
                { name: 'val', type: 'int', notNull: true, default: '20' },
              ],
              primaryKey: ['id'],
            },
          },
        ],
        'insert into ~t1 (~id) values (3);',
      ]);

      const res1 = await runQueryOnDriver(conn, driver, `select ~val from ~t1 where ~id = 1`);
      expect(res1.rows[0].val).toEqual(1);

      const res2 = await runQueryOnDriver(conn, driver, `select ~val from ~t1 where ~id = 2`);
      expect(res2.rows[0].val).toEqual(20);

      const res3 = await runQueryOnDriver(conn, driver, `select ~val from ~t1 where ~id = 3`);
      expect(res2.rows[0].val).toEqual(20);
    })
  );

  const T1 = {
    name: 't1.table.yaml',
    json: {
      name: 't1',
      columns: [
        { name: 'id', type: 'int' },
        { name: 'val', type: 'int' },
      ],
      primaryKey: ['id'],
    },
  };

  const T2 = {
    name: 't2.table.yaml',
    json: {
      name: 't2',
      columns: [
        { name: 'id', type: 'int' },
        { name: 'val', type: 'int' },
      ],
      primaryKey: ['id'],
    },
  };

  const T1_DELETED = {
    name: '_deleted_t1.table.yaml',
    json: {
      name: '_deleted_t1',
      columns: [
        { name: 'id', type: 'int' },
        { name: 'val', type: 'int' },
      ],
      primaryKey: ['id'],
    },
  };

  const T1_NO_VAL = {
    name: 't1.table.yaml',
    json: {
      name: 't1',
      columns: [{ name: 'id', type: 'int' }],
      primaryKey: ['id'],
    },
  };

  const T1_DELETED_VAL = {
    name: 't1.table.yaml',
    json: {
      name: 't1',
      columns: [
        { name: 'id', type: 'int' },
        { name: '_deleted_val', type: 'int' },
      ],
      primaryKey: ['id'],
    },
  };

  const V1 = {
    name: 'v1.view.sql',
    text: 'create view ~v1 as select * from ~t1',
  };

  const V1_VARIANT2 = {
    name: 'v1.view.sql',
    text: 'create view ~v1 as select ~id + ~id ~idsum from ~t1',
  };

  const V1_DELETED = {
    name: '_deleted_v1.view.sql',
    text: 'create view ~_deleted_v1 as select * from ~t1',
  };

  test.each(engines.filter(i => !i.skipDeploy).map(engine => [engine.label, engine]))(
    'Dont remove column - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDeploy(engine, conn, driver, [[T1], [T1_NO_VAL]], {
        finalCheckAgainstModel: [T1],
        disallowExtraObjects: true,
      });
    })
  );

  test.each(engines.filter(i => !i.skipDeploy).map(engine => [engine.label, engine]))(
    'Dont remove table - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDeploy(engine, conn, driver, [[T1], []], {
        finalCheckAgainstModel: [T1],
        disallowExtraObjects: true,
      });
    })
  );

  test.each(engines.filter(i => !i.skipDeploy).map(engine => [engine.label, engine]))(
    'Mark table removed - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDeploy(engine, conn, driver, [[T1], [], []], {
        markDeleted: true,
        disallowExtraObjects: true,
        finalCheckAgainstModel: [T1_DELETED],
      });
    })
  );

  test.each(
    engines
      .filter(i => !i.skipDeploy)
      .filter(engine => engine.supportRenameSqlObject)
      .map(engine => [engine.label, engine])
  )(
    'Mark view removed - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDeploy(engine, conn, driver, [[T1, V1], [T1], [T1]], {
        markDeleted: true,
        disallowExtraObjects: true,
        finalCheckAgainstModel: [T1, V1_DELETED],
      });
    })
  );

  test.each(engines.filter(i => !i.skipDeploy).map(engine => [engine.label, engine]))(
    'Mark column removed - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDeploy(engine, conn, driver, [[T1], [T1_NO_VAL]], {
        markDeleted: true,
        disallowExtraObjects: true,
        finalCheckAgainstModel: [T1_DELETED_VAL],
      });
    })
  );

  test.each(engines.filter(i => !i.skipDeploy).map(engine => [engine.label, engine]))(
    'Undelete table - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDeploy(
        engine,
        conn,
        driver,
        [
          [T1],
          // delete table
          [],
          // undelete table
          [T1],
        ],
        {
          markDeleted: true,
          disallowExtraObjects: true,
        }
      );
    })
  );

  test.each(
    engines
      .filter(i => !i.skipDeploy)
      .filter(engine => engine.supportRenameSqlObject)
      .map(engine => [engine.label, engine])
  )(
    'Undelete view - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDeploy(engine, conn, driver, [[T1, V1], [T1], [T1, V1]], {
        markDeleted: true,
        disallowExtraObjects: true,
        allowDropStatements: true,
      });
    })
  );

  test.each(engines.filter(i => !i.skipDeploy).map(engine => [engine.label, engine]))(
    'Undelete column - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDeploy(engine, conn, driver, [[T1], [T1_NO_VAL], [T1]], {
        markDeleted: true,
        disallowExtraObjects: true,
      });
    })
  );

  test.each(engines.filter(i => !i.skipDeploy).map(engine => [engine.label, engine]))(
    'View redeploy - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDeploy(
        engine,
        conn,
        driver,
        [
          [T1, V1],
          [T1, V1],
          [T1, V1],
        ],
        {
          markDeleted: true,
          disallowExtraObjects: true,
          allowDropStatements: true,
        }
      );
    })
  );

  test.each(engines.filter(i => !i.skipDeploy).map(engine => [engine.label, engine]))(
    'Change view - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDeploy(
        engine,
        conn,
        driver,
        [
          [T1, V1],
          [T1, V1_VARIANT2],
        ],
        {
          markDeleted: true,
          disallowExtraObjects: true,
          allowDropStatements: true,
        }
      );
    })
  );

  test.each(
    engines
      .filter(i => !i.skipDeploy)
      .filter(x => !x.skipDataModifications)
      .map(engine => [engine.label, engine])
  )(
    'Script drived deploy - basic predeploy - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDeploy(engine, conn, driver, [
        [
          {
            name: '1.predeploy.sql',
            text: 'create table ~t1 (~id int primary key); insert into ~t1 (~id) values (1);',
          },
        ],
      ]);

      const res1 = await runQueryOnDriver(conn, driver, 'SELECT COUNT(*) AS ~cnt FROM ~t1');
      expect(res1.rows[0].cnt == 1).toBeTruthy();

      const res2 = await runQueryOnDriver(conn, driver, 'SELECT COUNT(*) AS ~cnt FROM ~dbgate_deploy_journal');
      expect(res2.rows[0].cnt == 1).toBeTruthy();
    })
  );

  test.each(
    engines
      .filter(i => !i.skipDeploy)
      .filter(x => !x.skipDataModifications)
      .map(engine => [engine.label, engine])
  )(
    'Script drived deploy - install+uninstall - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDeploy(engine, conn, driver, [
        [
          {
            name: 't1.uninstall.sql',
            text: 'drop table ~t1',
          },
          {
            name: 't1.install.sql',
            text: 'create table ~t1 (~id int primary key); insert into ~t1 (~id) values (1)',
          },
          {
            name: 't2.once.sql',
            text: 'create table ~t2 (~id int primary key); insert into ~t2 (~id) values (1)',
          },
        ],
        [
          {
            name: 't1.uninstall.sql',
            text: 'drop table ~t1',
          },
          {
            name: 't1.install.sql',
            text: 'create table ~t1 (~id int primary key, ~val int); insert into ~t1 (~id, ~val) values (1, 11)',
          },
          {
            name: 't2.once.sql',
            text: 'insert into ~t2 (~id) values (2)',
          },
        ],
      ]);

      const res1 = await runQueryOnDriver(conn, driver, 'SELECT ~val from ~t1 where ~id = 1');
      expect(res1.rows[0].val == 11).toBeTruthy();

      const res2 = await runQueryOnDriver(conn, driver, 'SELECT COUNT(*) AS ~cnt FROM ~t2');
      expect(res2.rows[0].cnt == 1).toBeTruthy();

      const res3 = await runQueryOnDriver(conn, driver, 'SELECT COUNT(*) AS ~cnt FROM ~dbgate_deploy_journal');
      expect(res3.rows[0].cnt == 3).toBeTruthy();

      const res4 = await runQueryOnDriver(
        conn,
        driver,
        "SELECT ~run_count from ~dbgate_deploy_journal where ~name = 't2.once.sql'"
      );
      expect(res4.rows[0].run_count == 1).toBeTruthy();

      const res5 = await runQueryOnDriver(
        conn,
        driver,
        "SELECT ~run_count from ~dbgate_deploy_journal where ~name = 't1.install.sql'"
      );
      expect(res5.rows[0].run_count == 2).toBeTruthy();
    })
  );

  test.each(engines.filter(i => !i.skipDeploy).map(engine => [engine.label, engine]))(
    'Mark table removed, one remains - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDeploy(engine, conn, driver, [[T1, T2], [T2], [T2]], {
        markDeleted: true,
        disallowExtraObjects: true,
        finalCheckAgainstModel: [T1_DELETED, T2],
      });
    })
  );
});
