/// TODO

const { testWrapper, testWrapperPrepareOnly } = require('../tools');
const _ = require('lodash');
const engines = require('../engines');
const deployDb = require('dbgate-api/src/shell/deployDb');
const { databaseInfoFromYamlModel } = require('dbgate-tools');
const generateDeploySql = require('dbgate-api/src/shell/generateDeploySql');
const connectUtility = require('dbgate-api/src/utility/connectUtility');

function checkStructure(structure, model, { checkRenameDeletedObjects = false, disallowExtraObjects = false } = {}) {
  const expected = databaseInfoFromYamlModel(model);

  for (const expectedTable of expected.tables) {
    const realTable = structure.tables.find(x => x.pureName == expectedTable.pureName);

    for (const column of expectedTable.columns) {
      const realColumn = realTable.columns.find(x => x.columnName == column.columnName);
      expect(realColumn).toBeTruthy();
      expect(realColumn.notNull).toEqual(column.notNull);
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
}

async function testDatabaseDeploy(conn, driver, dbModelsYaml, options) {
  const {
    testEmptyLastScript,
    checkDeletedObjects,
    finalCheckAgainstModel,
    finalCheckAgainstFirstModel,
    dbdiffOptionsExtra,
  } = options || {};
  let index = 0;
  for (const loadedDbModel of dbModelsYaml) {
    const { sql, isEmpty } = await generateDeploySql({
      systemConnection: conn.isPreparedOnly ? undefined : conn,
      connection: conn.isPreparedOnly ? conn : undefined,
      driver,
      loadedDbModel,
      dbdiffOptionsExtra,
    });
    console.debug('Generated deploy script:', sql);
    expect(sql.toUpperCase().includes('DROP ')).toBeFalsy();

    console.log('dbModelsYaml.length', dbModelsYaml.length, index);
    if (testEmptyLastScript && index == dbModelsYaml.length - 1) {
      expect(isEmpty).toBeTruthy();
    }

    await deployDb({
      systemConnection: conn.isPreparedOnly ? undefined : conn,
      connection: conn.isPreparedOnly ? conn : undefined,
      driver,
      loadedDbModel,
      dbdiffOptionsExtra,
    });

    index++;
  }

  const dbhan = conn.isPreparedOnly ? await connectUtility(driver, conn, 'read') : conn;
  const structure = await driver.analyseFull(dbhan);
  if (conn.isPreparedOnly) await driver.close(dbhan);
  checkStructure(
    structure,
    finalCheckAgainstFirstModel ? dbModelsYaml[0] : finalCheckAgainstModel ?? dbModelsYaml[dbModelsYaml.length - 1],
    options
  );
}

describe('Deploy database', () => {
  test.each(engines.map(engine => [engine.label, engine]))(
    'Deploy database simple - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDeploy(conn, driver, [
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

  test.each(engines.map(engine => [engine.label, engine]))(
    'Deploy database simple - %s - not connected',
    testWrapperPrepareOnly(async (conn, driver, engine) => {
      await testDatabaseDeploy(conn, driver, [
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

  test.each(engines.map(engine => [engine.label, engine]))(
    'Deploy database simple twice - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDeploy(
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

  test.each(engines.map(engine => [engine.label, engine]))(
    'Add column - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDeploy(conn, driver, [
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

  test.each(engines.map(engine => [engine.label, engine]))(
    'Dont drop column - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDeploy(
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

  test.each(engines.filter(x => !x.skipReferences).map(engine => [engine.label, engine]))(
    'Foreign keys - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDeploy(
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

  test.each(engines.filter(x => !x.skipDataModifications).map(engine => [engine.label, engine]))(
    'Deploy preloaded data - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDeploy(conn, driver, [
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

      const res = await driver.query(conn, `select count(*) as cnt from t1`);
      expect(res.rows[0].cnt.toString()).toEqual('3');
    })
  );

  test.each(engines.filter(x => !x.skipDataModifications).map(engine => [engine.label, engine]))(
    'Deploy preloaded data - update - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDeploy(conn, driver, [
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

      const res = await driver.query(conn, `select val from t1 where id = 2`);
      expect(res.rows[0].val.toString()).toEqual('5');
    })
  );

  test.each(engines.enginesPostgre.map(engine => [engine.label, engine]))(
    'Current timestamp default value - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDeploy(conn, driver, [
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

      await driver.query(conn, `insert into t1 (id) values (1)`);
      const res = await driver.query(conn, ` select val from t1 where id = 1`);
      expect(res.rows[0].val.toString().substring(0, 2)).toEqual('20');
    })
  );

  test.each(engines.map(engine => [engine.label, engine]))(
    'Dont remove column - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDeploy(
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
        { finalCheckAgainstFirstModel: true, disallowExtraObjects: true }
      );
    })
  );

  test.each(engines.map(engine => [engine.label, engine]))(
    'Dont remove table - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDeploy(
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
          [],
        ],
        { finalCheckAgainstFirstModel: true, disallowExtraObjects: true }
      );
    })
  );

  test.each(engines.map(engine => [engine.label, engine]))(
    'Mark table removed - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDeploy(
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
          [],
        ],
        {
          checkRenameDeletedObjects: true,
          dbdiffOptionsExtra: {
            allowTableMarkDropped: true,
          },
        }
      );
    })
  );
});
