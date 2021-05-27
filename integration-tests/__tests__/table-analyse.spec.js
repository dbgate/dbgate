const requireEngineDriver = require('dbgate-api/src/utility/requireEngineDriver');
const engines = require('../engines');
const { connect, randomDbName } = require('../tools');

const t1Sql = 'CREATE TABLE t1 (id int not null primary key, val varchar(50) null)';
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


describe('Table analyse', () => {
  test.each(engines.map(engine => [engine.label, engine]))(
    'Table structure - full analysis (%s)',
    async (label, engine) => {
      const conn = await connect(engine, randomDbName());
      try {
        const driver = requireEngineDriver(engine.connection);

        await driver.query(conn, t1Sql);

        const structure = await driver.analyseFull(conn);

        expect(structure.tables.length).toEqual(1);
        expect(structure.tables[0]).toEqual(t1Match);
      } finally {
        await driver.close(conn);
      }
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
