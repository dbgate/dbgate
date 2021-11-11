const engines = require('../engines');
const stream = require('stream');
const { testWrapper } = require('../tools');
const tableWriter = require('dbgate-api/src/shell/tableWriter');
const copyStream = require('dbgate-api/src/shell/copyStream');
const fakeObjectReader = require('dbgate-api/src/shell/fakeObjectReader');

function createImportStream() {
  const pass = new stream.PassThrough({
    objectMode: true,
  });
  pass.write({ columns: [{ columnName: 'id' }, { columnName: 'country' }], __isStreamHeader: true });
  pass.write({ id: 1, country: 'Czechia' });
  pass.write({ id: 2, country: 'Austria' });
  pass.write({ country: 'Germany', id: 3 });
  pass.write({ country: 'Romania', id: 4 });
  pass.write({ country: 'Great Britain', id: 5 });
  pass.write({ country: 'Bosna, Hecegovina', id: 6 });
  pass.end();

  return pass;
}

describe('DB Import', () => {
  test.each(engines.map(engine => [engine.label, engine]))(
    'Import one table - %s',
    testWrapper(async (conn, driver, engine) => {
      // const reader = await fakeObjectReader({ delay: 10 });
      // const reader = await fakeObjectReader();
      const reader = createImportStream();
      const writer = await tableWriter({
        systemConnection: conn,
        driver,
        pureName: 't1',
        createIfNotExists: true,
      });
      await copyStream(reader, writer);

      const res = await driver.query(conn, `select count(*) as cnt from t1`);
      expect(res.rows[0].cnt.toString()).toEqual('6');
    })
  );

  test.each(engines.map(engine => [engine.label, engine]))(
    'Import two tables - %s',
    testWrapper(async (conn, driver, engine) => {
      // const reader = await fakeObjectReader({ delay: 10 });
      // const reader = await fakeObjectReader();
      const reader1 = createImportStream();
      const writer1 = await tableWriter({
        systemConnection: conn,
        driver,
        pureName: 't1',
        createIfNotExists: true,
      });
      await copyStream(reader1, writer1);

      const reader2 = createImportStream();
      const writer2 = await tableWriter({
        systemConnection: conn,
        driver,
        pureName: 't2',
        createIfNotExists: true,
      });
      await copyStream(reader2, writer2);

      const res1 = await driver.query(conn, `select count(*) as cnt from t1`);
      expect(res1.rows[0].cnt.toString()).toEqual('6');

      const res2 = await driver.query(conn, `select count(*) as cnt from t2`);
      expect(res2.rows[0].cnt.toString()).toEqual('6');
    })
  );

});
