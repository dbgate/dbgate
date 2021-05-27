const engines = require('../engines');
const { testWrapper } = require('../tools');

const t1Sql = 'CREATE TABLE t1 (id int not null primary key, val1 varchar(50) null)';
const t2Sql = 'CREATE TABLE t2 (id int not null primary key, val2 varchar(50) null)';

const txMatch = (tname, vcolname, nextcol) =>
  expect.objectContaining({
    pureName: tname,
    columns: [
      expect.objectContaining({
        columnName: 'id',
        notNull: true,
        dataType: expect.stringContaining('int'),
      }),
      expect.objectContaining({
        columnName: vcolname,
        notNull: false,
        dataType: expect.stringMatching(/.*char.*\(50\)/),
      }),
      ...(nextcol
        ? [
            expect.objectContaining({
              columnName: 'nextcol',
              notNull: false,
              dataType: expect.stringMatching(/.*char.*\(50\)/),
            }),
          ]
        : []),
    ],
    primaryKey: expect.objectContaining({
      columns: [
        expect.objectContaining({
          columnName: 'id',
        }),
      ],
    }),
  });

const t1Match = txMatch('t1', 'val1');
const t2Match = txMatch('t2', 'val2');
const t2NextColMatch = txMatch('t2', 'val2', true);

describe('Table analyse', () => {
  test.each(engines.map(engine => [engine.label, engine]))(
    'Table structure - full analysis - %s',
    testWrapper(async (conn, driver, engine) => {
      await driver.query(conn, t1Sql);

      const structure = await driver.analyseFull(conn);

      expect(structure.tables.length).toEqual(1);
      expect(structure.tables[0]).toEqual(t1Match);
    })
  );

  test.each(engines.map(engine => [engine.label, engine]))(
    'Table add - incremental analysis - %s',
    testWrapper(async (conn, driver, engine) => {
      await driver.query(conn, t2Sql);

      const structure1 = await driver.analyseFull(conn);
      expect(structure1.tables.length).toEqual(1);
      expect(structure1.tables[0]).toEqual(t2Match);

      await driver.query(conn, t1Sql);
      const structure2 = await driver.analyseIncremental(conn, structure1);

      expect(structure2.tables.length).toEqual(2);
      expect(structure2.tables.find(x => x.pureName == 't1')).toEqual(t1Match);
      expect(structure2.tables.find(x => x.pureName == 't2')).toEqual(t2Match);
    })
  );

  test.each(engines.map(engine => [engine.label, engine]))(
    'Table remove - incremental analysis - %s',
    testWrapper(async (conn, driver, engine) => {
      await driver.query(conn, t1Sql);
      await driver.query(conn, t2Sql);
      const structure1 = await driver.analyseFull(conn);
      expect(structure1.tables.length).toEqual(2);
      expect(structure1.tables.find(x => x.pureName == 't1')).toEqual(t1Match);
      expect(structure1.tables.find(x => x.pureName == 't2')).toEqual(t2Match);

      await driver.query(conn, 'DROP TABLE t2');
      const structure2 = await driver.analyseIncremental(conn, structure1);

      expect(structure2.tables.length).toEqual(1);
      expect(structure2.tables[0]).toEqual(t1Match);
    })
  );

  test.each(engines.map(engine => [engine.label, engine]))(
    'Table change - incremental analysis - %s',
    testWrapper(async (conn, driver, engine) => {
      await driver.query(conn, t1Sql);
      await driver.query(conn, t2Sql);
      const structure1 = await driver.analyseFull(conn);

      if (engine.dbSnapshotBySeconds) await new Promise(resolve => setTimeout(resolve, 1100));
      
      await driver.query(conn, 'ALTER TABLE t2 ADD nextcol varchar(50)');
      const structure2 = await driver.analyseIncremental(conn, structure1);

      expect(structure2).toBeTruthy(); // if falsy, no modification is detected

      expect(structure2.tables.length).toEqual(2);
      expect(structure2.tables.find(x => x.pureName == 't1')).toEqual(t1Match);
      expect(structure2.tables.find(x => x.pureName == 't2')).toEqual(t2NextColMatch);
    })
  );
});
