const engines = require('../engines');
const requireEngineDriver = require('dbgate-api/src/utility/requireEngineDriver');
const crypto = require('crypto');

global.DBGATE_TOOLS = require('dbgate-tools');

function randomDbName() {
  const generatedKey = crypto.randomBytes(6);
  const newKey = generatedKey.toString('hex');
  return `db${newKey}`;
}

const t1Match = expect.objectContaining({
  pureName: 't1',
  columns: [
    expect.objectContaining({
      columnName: 'id',
      notNull: true,
      dataType: expect.stringContaining('int'),
    }),
    expect.objectContaining({
      columnName: 'val',
      notNull: false,
      dataType: expect.stringMatching(/.*char.*\(50\)/),
    }),
  ],
  primaryKey: expect.objectContaining({
    columns: [
      expect.objectContaining({
        columnName: 'id',
      }),
    ],
  }),
});
const t1Sql = 'CREATE TABLE t1 (id int not null primary key, val varchar(50) null)';

async function connect(engine, database) {
  const { connection } = engine;
  const driver = requireEngineDriver(connection);

  if (engine.generateDbFile) {
    const conn = await driver.connect({
      ...connection,
      databaseFile: `dbtemp/${database}`,
    });
    return conn;
  } else {
    const conn = await driver.connect(connection);
    await driver.query(conn, `CREATE DATABASE ${database}`);
    await driver.close(conn);

    const res = await driver.connect({
      ...connection,
      database,
    });
    return res;
  }
}

describe('Analyse tests', () => {
  test.each(engines.map(engine => [engine.label, engine]))(
    'Table structure - full analysis (%s)',
    async (label, engine) => {
      const conn = await connect(engine, randomDbName());
      const driver = requireEngineDriver(engine.connection);

      await driver.query(conn, t1Sql);

      const structure = await driver.analyseFull(conn);

      expect(structure.tables.length).toEqual(1);
      expect(structure.tables[0]).toEqual(t1Match);
      await driver.close(conn);
    }
  );

  test.each(engines.map(engine => [engine.label, engine]))(
    'Table add - incremental analysis (%s)',
    async (label, engine) => {
      const conn = await connect(engine, randomDbName());
      const driver = requireEngineDriver(engine.connection);

      await driver.query(conn, 'CREATE TABLE t0 (id0 int)');
      const structure1 = await driver.analyseFull(conn);
      await driver.query(conn, t1Sql);
      const structure2 = await driver.analyseIncremental(conn, structure1);

      expect(structure2.tables.length).toEqual(2);
      expect(structure2.tables.find(x => x.pureName == 't1')).toEqual(t1Match);
      await driver.close(conn);
    }
  );

  test.each(engines.map(engine => [engine.label, engine]))(
    'Table remove - incremental analysis (%s)',
    async (label, engine) => {
      const conn = await connect(engine, randomDbName());
      const driver = requireEngineDriver(engine.connection);

      await driver.query(conn, t1Sql);
      await driver.query(conn, 'CREATE TABLE t2 (id2 int)');
      const structure1 = await driver.analyseFull(conn);
      await driver.query(conn, 'DROP TABLE t2');
      const structure2 = await driver.analyseIncremental(conn, structure1);

      expect(structure2.tables.length).toEqual(1);
      expect(structure2.tables[0]).toEqual(t1Match);
      await driver.close(conn);
    }
  );

});
