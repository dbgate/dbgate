/// TODO

const { testWrapper } = require('../tools');
const _ = require('lodash');
const engines = require('../engines');
const deployDb = require('dbgate-api/src/shell/deployDb');
const { databaseInfoFromYamlModel } = require('dbgate-tools');
const generateDeploySql = require('dbgate-api/src/shell/generateDeploySql');

function checkStructure(structure, model) {
  const expected = databaseInfoFromYamlModel(model);
  expect(structure.tables.length).toEqual(expected.tables.length);

  for (const [realTable, expectedTable] of _.zip(structure.tables, expected.tables)) {
    expect(realTable.columns.length).toEqual(expectedTable.columns.length);
  }
}

async function testDatabaseDeploy(conn, driver, dbModelsYaml) {
  for (const loadedDbModel of dbModelsYaml) {
    const sql = await generateDeploySql({
      systemConnection: conn,
      driver,
      loadedDbModel,
    });
    expect(sql.toUpperCase().includes('DROP ')).toBeFalsy();

    await deployDb({
      systemConnection: conn,
      driver,
      loadedDbModel,
    });
  }

  const structure = await driver.analyseFull(conn);
  checkStructure(structure, dbModelsYaml[dbModelsYaml.length - 1]);
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
    'Deploy database simple twice - %s',
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
              columns: [{ name: 'id', type: 'int' }],
              primaryKey: ['id'],
            },
          },
        ],
      ]);
    })
  );
});
