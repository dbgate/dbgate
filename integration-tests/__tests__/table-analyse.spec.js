const { runCommandOnDriver } = require('dbgate-tools');
const engines = require('../engines');
const { testWrapper } = require('../tools');

/**
 * @param {import('dbgate-types').TestEngineInfo} engine
 */
const t1Sql = engine =>
  `CREATE TABLE ~t1 (~id int ${engine.skipNullability ? '' : 'not null'} primary key, ~val1 ${
    engine.useTextTypeForStrings ? 'text' : 'varchar(50)'
  })`;

const ix1Sql = 'CREATE index ~ix1 ON ~t1(~val1, ~id)';

/**
 * @param {import('dbgate-types').TestEngineInfo} engine
 */
const t2Sql = engine =>
  `CREATE TABLE ~t2 (~id int ${engine.skipNullability ? '' : 'not null'} primary key, ~val2 ${
    engine.useTextTypeForStrings ? 'text' : 'varchar(50)'
  } ${engine.skipUnique ? '' : 'unique'})`;
/**
 * @param {import('dbgate-types').TestEngineInfo} engine
 */
const t3Sql = engine =>
  `CREATE TABLE ~t3 (~id int ${
    engine.skipNullability ? '' : 'not null'
  } primary key, ~valfk int, foreign key (~valfk) references ~t2(~id))`;
/**
 * @param {import('dbgate-types').TestEngineInfo} engine
 */
const t4Sql = engine =>
  `CREATE TABLE ~t4 (~id int ${engine.skipNullability ? '' : 'not null'} primary key, ~valdef int default 12 ${
    engine.skipNullability ? '' : 'not null'
  })`;
// const fkSql = 'ALTER TABLE t3 ADD FOREIGN KEY (valfk) REFERENCES t2(id)'

const txMatch = (engine, tname, vcolname, nextcol, defaultValue) =>
  expect.objectContaining({
    pureName: tname,
    columns: [
      expect.objectContaining({
        columnName: 'id',
        dataType: expect.stringMatching(/int.*|number/i),
        ...(engine.skipNullability ? {} : { notNull: true }),
      }),
      expect.objectContaining({
        columnName: vcolname,
        ...(engine.skipNullability ? {} : { notNull: !!defaultValue }),
        ...(defaultValue && !engine.skipDefaultValue
          ? { defaultValue }
          : {
              dataType: engine.skipStringLength
                ? expect.stringMatching(/.*string|char.*|text/i)
                : expect.stringMatching(/.*char.*\(50\)|text/i),
            }),
      }),
      ...(nextcol
        ? [
            expect.objectContaining({
              columnName: 'nextcol',
              ...(engine.skipNullability ? {} : { notNull: false }),
              dataType: engine.skipStringLength
                ? expect.stringMatching(/.*string.*|char.*|text/i)
                : expect.stringMatching(/.*char.*\(50\).*|text/i),
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

const t1Match = engine => txMatch(engine, 't1', 'val1');
const t2Match = engine => txMatch(engine, 't2', 'val2');
const t2NextColMatch = engine => txMatch(engine, 't2', 'val2', true);
const t4Match = engine => txMatch(engine, 't4', 'valdef', null, '12');

describe('Table analyse', () => {
  test.each(engines.map(engine => [engine.label, engine]))(
    'Table structure - full analysis - %s',
    testWrapper(async (conn, driver, engine) => {
      await runCommandOnDriver(conn, driver, dmp => dmp.put(t1Sql(engine)));

      const structure = await driver.analyseFull(conn);

      expect(structure.tables.length).toEqual(1);
      expect(structure.tables[0]).toEqual(t1Match(engine));
    })
  );

  test.each(engines.map(engine => [engine.label, engine]))(
    'Table add - incremental analysis - %s',
    testWrapper(async (conn, driver, engine) => {
      await runCommandOnDriver(conn, driver, dmp => dmp.put(t2Sql(engine)));

      const structure1 = await driver.analyseFull(conn);
      expect(structure1.tables.length).toEqual(1);
      expect(structure1.tables[0]).toEqual(t2Match(engine));

      await runCommandOnDriver(conn, driver, dmp => dmp.put(t1Sql(engine)));
      const structure2 = await driver.analyseIncremental(conn, structure1);

      expect(structure2.tables.length).toEqual(2);
      expect(structure2.tables.find(x => x.pureName == 't1')).toEqual(t1Match(engine));
      expect(structure2.tables.find(x => x.pureName == 't2')).toEqual(t2Match(engine));
    })
  );

  test.each(engines.map(engine => [engine.label, engine]))(
    'Table remove - incremental analysis - %s',
    testWrapper(async (conn, driver, engine) => {
      await runCommandOnDriver(conn, driver, dmp => dmp.put(t1Sql(engine)));
      await runCommandOnDriver(conn, driver, dmp => dmp.put(t2Sql(engine)));
      const structure1 = await driver.analyseFull(conn);
      expect(structure1.tables.length).toEqual(2);
      expect(structure1.tables.find(x => x.pureName == 't1')).toEqual(t1Match(engine));
      expect(structure1.tables.find(x => x.pureName == 't2')).toEqual(t2Match(engine));

      await runCommandOnDriver(conn, driver, dmp => dmp.put('DROP TABLE ~t2'));
      const structure2 = await driver.analyseIncremental(conn, structure1);

      expect(structure2.tables.length).toEqual(1);
      expect(structure2.tables[0]).toEqual(t1Match(engine));
    })
  );

  test.each(engines.map(engine => [engine.label, engine]))(
    'Table change - incremental analysis - %s',
    testWrapper(async (conn, driver, engine) => {
      await runCommandOnDriver(conn, driver, dmp => dmp.put(t1Sql(engine)));
      await runCommandOnDriver(conn, driver, dmp => dmp.put(t2Sql(engine)));
      const structure1 = await driver.analyseFull(conn);

      if (engine.dbSnapshotBySeconds) await new Promise(resolve => setTimeout(resolve, 1100));

      await runCommandOnDriver(conn, driver, dmp =>
        dmp.put(
          `ALTER TABLE ~t2 ADD ${engine.alterTableAddColumnSyntax ? 'COLUMN' : ''} ~nextcol ${
            engine.useTextTypeForStrings ? 'text' : 'varchar(50)'
          }`
        )
      );
      const structure2 = await driver.analyseIncremental(conn, structure1);

      expect(structure2).toBeTruthy(); // if falsy, no modification is detected

      expect(structure2.tables.length).toEqual(2);
      expect(structure2.tables.find(x => x.pureName == 't1')).toEqual(t1Match(engine));

      const t2 = structure2.tables.find(x => x.pureName == 't2');
      const t2ColumnsOrder = ['id', 'val2', 'nextcol'];
      const t2Enchanted = engine.forceSortStructureColumns
        ? {
            ...t2,
            columns: t2.columns.sort(
              (a, b) => t2ColumnsOrder.indexOf(a.columnName) - t2ColumnsOrder.indexOf(b.columnName)
            ),
          }
        : t2;
      expect(t2Enchanted).toEqual(t2NextColMatch(engine));
    })
  );

  test.each(engines.filter(x => !x.skipIndexes).map(engine => [engine.label, engine]))(
    'Index - full analysis - %s',
    testWrapper(async (conn, driver, engine) => {
      await runCommandOnDriver(conn, driver, dmp => dmp.put(t1Sql(engine)));
      await runCommandOnDriver(conn, driver, dmp => dmp.put(ix1Sql));
      const structure = await driver.analyseFull(conn);

      const t1 = structure.tables.find(x => x.pureName == 't1');
      expect(t1.indexes.length).toEqual(1);
      expect(t1.indexes[0].columns.length).toEqual(2);
      expect(t1.indexes[0].columns[0]).toEqual(expect.objectContaining({ columnName: 'val1' }));
      expect(t1.indexes[0].columns[1]).toEqual(expect.objectContaining({ columnName: 'id' }));
    })
  );

  test.each(engines.filter(x => !x.skipUnique).map(engine => [engine.label, engine]))(
    'Unique - full analysis - %s',
    testWrapper(async (conn, driver, engine) => {
      await runCommandOnDriver(conn, driver, dmp => dmp.put(t2Sql(engine)));
      const structure = await driver.analyseFull(conn);

      const t2 = structure.tables.find(x => x.pureName == 't2');
      // const indexesAndUniques = [...t2.uniques, ...t2.indexes];
      expect(t2.uniques.length).toEqual(1);
      expect(t2.uniques[0].columns.length).toEqual(1);
      expect(t2.uniques[0].columns[0]).toEqual(expect.objectContaining({ columnName: 'val2' }));
    })
  );

  test.each(engines.filter(x => !x.skipReferences).map(engine => [engine.label, engine]))(
    'Foreign key - full analysis - %s',
    testWrapper(async (conn, driver, engine) => {
      await runCommandOnDriver(conn, driver, dmp => dmp.put(t2Sql(engine)));
      await runCommandOnDriver(conn, driver, dmp => dmp.put(t3Sql(engine)));
      // await driver.query(conn, fkSql);

      const structure = await driver.analyseFull(conn);

      const t3 = structure.tables.find(x => x.pureName == 't3');
      console.log('T3', t3.foreignKeys[0].columns);
      expect(t3.foreignKeys.length).toEqual(1);
      expect(t3.foreignKeys[0].columns.length).toEqual(1);
      expect(t3.foreignKeys[0]).toEqual(expect.objectContaining({ refTableName: 't2' }));
      expect(t3.foreignKeys[0].columns[0]).toEqual(
        expect.objectContaining({ columnName: 'valfk', refColumnName: 'id' })
      );
    })
  );

  test.each(engines.filter(engine => !engine.skipDefaultValue).map(engine => [engine.label, engine]))(
    'Table structure - default value - %s',
    testWrapper(async (conn, driver, engine) => {
      await runCommandOnDriver(conn, driver, dmp => dmp.put(t4Sql(engine)));

      const structure = await driver.analyseFull(conn);

      expect(structure.tables.length).toEqual(1);
      expect(structure.tables[0]).toEqual(t4Match(engine));
    })
  );
});
