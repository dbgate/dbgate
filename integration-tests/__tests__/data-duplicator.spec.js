const engines = require('../engines');
const { testWrapper } = require('../tools');
const dataDuplicator = require('dbgate-api/src/shell/dataDuplicator');
const fakeObjectReader = require('dbgate-api/src/shell/fakeObjectReader');

const t1Sql = 'CREATE TABLE t1 (id int not null primary key, val varchar(50) null)';
const t2Sql =
  'CREATE TABLE t2 (id int not null primary key, val varchar(50) null, valfk int, foreign key (valfk) references t2(id))';

describe('Data duplicator', () => {
  test.each(engines.map(engine => [engine.label, engine]))(
    'Insert simple data - %s',
    testWrapper(async (conn, driver, engine) => {
      await driver.query(conn, t1Sql);
      await driver.query(conn, t2Sql);

      const t1 = await fakeObjectReader({
        dynamicData: [
          { id: 1, val: 'v1' },
          { id: 2, val: 'v2' },
          { id: 3, val: 'v3' },
        ],
      });
      const t2 = await fakeObjectReader({
        dynamicData: [
          { id: 1, val: 'v1', valfk: 1 },
          { id: 2, val: 'v2', valfk: 2 },
          { id: 3, val: 'v3', valfk: 3 },
        ],
      });

      await dataDuplicator({
        systemConnection: conn,
        driver,
        items: [
          {
            name: 't1',
            operation: 'copy',
            openStream: () => t1,
          },
          {
            name: 't2',
            operation: 'copy',
            openStream: () => t2,
          },
        ],
      });

      await dataDuplicator({
        systemConnection: conn,
        driver,
        items: [
          {
            name: 't1',
            operation: 'copy',
            openStream: () => t1,
          },
          {
            name: 't2',
            operation: 'copy',
            openStream: () => t2,
          },
        ],
      });

      const res1 = await driver.query(conn, `select count(*) as cnt from t1`);
      expect(res1.rows[0].cnt.toString()).toEqual('6');

      const res2 = await driver.query(conn, `select count(*) as cnt from t2`);
      expect(res2.rows[0].cnt.toString()).toEqual('6');
    })
  );
});
