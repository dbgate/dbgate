const engines = require('../engines');
const { splitQuery } = require('dbgate-query-splitter');
const { testWrapper } = require('../tools');
const { runQueryOnDriver, runCommandOnDriver, formatQueryWithoutParams } = require('dbgate-tools');

const initSql = [
  'CREATE TABLE ~t1 (~id int primary key)',
  'INSERT INTO ~t1 (~id) VALUES (1)',
  'INSERT INTO ~t1 (~id) VALUES (2)',
];

expect.extend({
  dataRow(row, expected) {
    for (const key in expected) {
      if (row[key] != expected[key]) {
        return {
          pass: false,
          message: () => `Different key: ${key}`,
        };
      }
    }
    return {
      pass: true,
      message: () => '',
    };
  },
});

class StreamHandler {
  constructor(resolve) {
    this.results = [];
    this.resolve = resolve;
    this.infoRows = [];
  }
  row(row) {
    this.results[this.results.length - 1].rows.push(row);
  }
  recordset(columns) {
    this.results.push({
      columns,
      rows: [],
    });
  }
  done(result) {
    this.resolve(this.results);
  }
  info(msg) {
    this.infoRows.push(msg);
  }
}

function executeStreamItem(driver, conn, sql) {
  return new Promise(resolve => {
    const handler = new StreamHandler(resolve);
    driver.stream(conn, formatQueryWithoutParams(driver, sql), handler);
  });
}

async function executeStream(driver, conn, sql) {
  const results = [];
  for (const sqlItem of splitQuery(sql, driver.getQuerySplitterOptions('stream'))) {
    const item = await executeStreamItem(driver, conn, sqlItem);
    results.push(...item);
  }
  return results;
}

describe('Query', () => {
  test.each(engines.map(engine => [engine.label, engine]))(
    'Simple query - %s',
    testWrapper(async (conn, driver, engine) => {
      for (const sql of initSql) {
        await runCommandOnDriver(conn, driver, dmp => dmp.put(sql));
      }

      const res = await runQueryOnDriver(conn, driver, dmp =>
        dmp.put(`SELECT ~id FROM ~t1 ${engine.skipOrderBy ? '' : 'ORDER BY ~id'}`)
      );
      expect(res.columns).toEqual([
        expect.objectContaining({
          columnName: 'id',
        }),
      ]);

      expect(res.rows).toEqual([
        expect.dataRow({
          id: 1,
        }),
        expect.dataRow({
          id: 2,
        }),
      ]);
    })
  );

  test.each(engines.map(engine => [engine.label, engine]))(
    'Simple stream query - %s',
    testWrapper(async (conn, driver, engine) => {
      for (const sql of initSql) {
        await runCommandOnDriver(conn, driver, dmp => dmp.put(sql));
      }

      const results = await executeStream(
        driver,
        conn,
        `SELECT ~id FROM ~t1 ${engine.skipOrderBy ? '' : 'ORDER BY ~id'}`
      );
      expect(results.length).toEqual(1);
      const res = results[0];

      expect(res.columns).toEqual([expect.objectContaining({ columnName: 'id' })]);
      expect(res.rows).toEqual([expect.dataRow({ id: 1 }), expect.dataRow({ id: 2 })]);
    })
  );

  test.each(engines.filter(i => !i.skipOrderBy).map(engine => [engine.label, engine]))(
    'More queries - %s',
    testWrapper(async (conn, driver, engine) => {
      for (const sql of initSql) {
        await runCommandOnDriver(conn, driver, dmp => dmp.put(sql));
      }

      const results = await executeStream(
        driver,
        conn,
        'SELECT ~id FROM ~t1 ORDER BY ~id; SELECT ~id FROM ~t1 ORDER BY ~id DESC'
      );
      expect(results.length).toEqual(2);

      const res1 = results[0];
      expect(res1.columns).toEqual([expect.objectContaining({ columnName: 'id' })]);
      expect(res1.rows).toEqual([expect.dataRow({ id: 1 }), expect.dataRow({ id: 2 })]);

      const res2 = results[1];
      expect(res2.columns).toEqual([expect.objectContaining({ columnName: 'id' })]);
      expect(res2.rows).toEqual([expect.dataRow({ id: 2 }), expect.dataRow({ id: 1 })]);
    })
  );

  test.each(engines.map(engine => [engine.label, engine]))(
    'Script - return data - %s',
    testWrapper(async (conn, driver, engine) => {
      const results = await executeStream(
        driver,
        conn,
        `CREATE TABLE ~t1 (~id int primary key); INSERT INTO ~t1 (~id) VALUES (1); INSERT INTO ~t1 (~id) VALUES (2); SELECT ~id FROM ~t1 ${
          engine.skipOrderBy ? '' : 'ORDER BY ~id'
        }; `
      );
      expect(results.length).toEqual(1);

      const res1 = results[0];
      expect(res1.columns).toEqual([expect.objectContaining({ columnName: 'id' })]);
      expect(res1.rows).toEqual([expect.dataRow({ id: 1 }), expect.dataRow({ id: 2 })]);
    })
  );

  test.each(engines.map(engine => [engine.label, engine]))(
    'Script - no data - %s',
    testWrapper(async (conn, driver, engine) => {
      const results = await executeStream(
        driver,
        conn,
        'CREATE TABLE ~t1 (~id int); INSERT INTO ~t1 (~id) VALUES (1); INSERT INTO ~t1 (~id) VALUES (2) '
      );
      expect(results.length).toEqual(0);
    })
  );

  test.each(engines.filter(x => !x.skipDataModifications).map(engine => [engine.label, engine]))(
    'Save data query - %s',
    testWrapper(async (conn, driver, engine) => {
      for (const sql of initSql) {
        await runCommandOnDriver(conn, driver, dmp => dmp.put(sql));
      }

      await driver.script(
        conn,
        formatQueryWithoutParams(
          driver,
          'INSERT INTO ~t1 (~id) VALUES (3);INSERT INTO ~t1 (~id) VALUES (4);UPDATE ~t1 SET ~id=10 WHERE ~id=1;DELETE FROM ~t1 WHERE ~id=2;'
        ),
        { discardResult: true }
      );
      const res = await runQueryOnDriver(conn, driver, dmp => dmp.put('SELECT COUNT(*) AS ~cnt FROM ~t1'));
      // console.log(res);
      expect(res.rows[0].cnt == 3).toBeTruthy();
    })
  );

  test.each(engines.filter(x => !x.skipDataDuplicator).map(engine => [engine.label, engine]))(
    'Select scope identity - %s',
    testWrapper(async (conn, driver, engine) => {
      await runCommandOnDriver(conn, driver, dmp =>
        dmp.createTable({
          pureName: 't1',
          columns: [
            { columnName: 'id', dataType: 'int', notNull: true, autoIncrement: true },
            { columnName: 'val', dataType: engine.useTextTypeForStrings ? 'text' : 'varchar(50)' },
          ],
          primaryKey: {
            columns: [{ columnName: 'id' }],
          },
        })
      );

      const structure = await driver.analyseFull(conn);
      const table = structure.tables.find(x => x.pureName == 't1');

      let res;
      if (driver.dialect.requireStandaloneSelectForScopeIdentity) {
        await runCommandOnDriver(conn, driver, dmp => dmp.put("INSERT INTO ~t1 (~val) VALUES ('aaa')"));
        res = await runQueryOnDriver(conn, driver, dmp => dmp.selectScopeIdentity(table));
      } else {
        res = await runQueryOnDriver(conn, driver, dmp => {
          dmp.putCmd("INSERT INTO ~t1 (~val) VALUES ('aaa')");
          dmp.selectScopeIdentity(table);
        });
      }
      const row = res.rows[0];
      const keys = Object.keys(row);
      expect(keys.length).toEqual(1);
      expect(row[keys[0]] == 1).toBeTruthy();
    })
  );
});
