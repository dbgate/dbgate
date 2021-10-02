/// TODO

const { testWrapper } = require('../tools');
const engines = require('../engines');
const deployDb = require('dbgate-api/src/shell/deployDb');

async function testDatabaseDeploy(conn, driver, dbModelYaml, checkDb) {
  await deployDb({
    systemConnection: conn,
    driver,
    loadedDbModel: dbModelYaml,
  });

  const structure = await driver.analyseFull(conn);
  checkDb(structure);
}

describe('Deploy database', () => {
  test.each(engines.map(engine => [engine.label, engine]))(
    'Drop referenced table - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDeploy(
        conn,
        driver,
        [
          {
            name: 'tables.yaml',
            json: {
              name: 't1',
              columns: [{ name: 'id', type: 'int' }],
              primaryKey: ['id'],
            },
          },
        ],
        db => {
          expect(db.tables.length).toEqual(1);
        }
      );
    })
  );
});
