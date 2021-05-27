const engines = require('../engines');
const requireEngineDriver = require('dbgate-api/src/utility/requireEngineDriver');
const crypto = require('crypto');

global.DBGATE_TOOLS = require('dbgate-tools');

function randomDbName() {
  const generatedKey = crypto.randomBytes(6);
  const newKey = generatedKey.toString('hex');
  return `db${newKey}`;
}

async function connect(connection, database) {
  const driver = requireEngineDriver(connection);
  const conn = await driver.connect(connection);
  await driver.query(conn, `CREATE DATABASE ${database}`);
  await driver.close(conn);

  const res = await driver.connect({
    ...connection,
    database,
  });
  return res;
}

describe('Analyse tests', () => {
  test.each(engines.map(engine => [engine.label, engine.connection]))(
    'Table - full analysis (%s)',
    async (label, connection) => {
      const conn = await connect(connection, randomDbName());
      const driver = requireEngineDriver(connection);

      await driver.query(conn, 'CREATE TABLE t1 (id int)');

      const structure = await driver.analyseFull(conn);

      expect(structure.tables.length).toEqual(1);
      expect(structure.tables[0]).toEqual(
        expect.objectContaining({
          pureName: 't1',
          columns: [
            expect.objectContaining({
              columnName: 'id',
            }),
          ],
        })
      );
      await driver.close(conn);
    }
  );

  test.each(engines.map(engine => [engine.label, engine.connection]))(
    'Table add - incremental analysis (%s)',
    async (label, connection) => {
      const conn = await connect(connection, randomDbName());
      const driver = requireEngineDriver(connection);

      await driver.query(conn, 'CREATE TABLE t1 (id int)');
      const structure1 = await driver.analyseFull(conn);
      await driver.query(conn, 'CREATE TABLE t2 (id2 int)');
      const structure2 = await driver.analyseIncremental(conn, structure1);

      expect(structure2.tables.length).toEqual(2);
      expect(structure2.tables.find(x => x.pureName == 't2')).toEqual(
        expect.objectContaining({
          pureName: 't2',
          columns: [
            expect.objectContaining({
              columnName: 'id2',
            }),
          ],
        })
      );
      await driver.close(conn);
    }
  );
});
