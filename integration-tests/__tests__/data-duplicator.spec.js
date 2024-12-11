const engines = require('../engines');
const stream = require('stream');
const { testWrapper } = require('../tools');
const dataDuplicator = require('dbgate-api/src/shell/dataDuplicator');
const { runCommandOnDriver, runQueryOnDriver } = require('dbgate-tools');

describe('Data duplicator', () => {
  test.each(engines.filter(x => !x.skipDataDuplicator).map(engine => [engine.label, engine]))(
    'Insert simple data - %s',
    testWrapper(async (conn, driver, engine) => {
      runCommandOnDriver(conn, driver, dmp =>
        dmp.createTable({
          pureName: 't1',
          columns: [
            { columnName: 'id', dataType: 'int', autoIncrement: true, notNull: true },
            { columnName: 'val', dataType: 'varchar(50)' },
          ],
          primaryKey: {
            columns: [{ columnName: 'id' }],
          },
        })
      );
      runCommandOnDriver(conn, driver, dmp =>
        dmp.createTable({
          pureName: 't2',
          columns: [
            { columnName: 'id', dataType: 'int', autoIncrement: true, notNull: true },
            { columnName: 'val', dataType: 'varchar(50)' },
            { columnName: 'valfk', dataType: 'int', notNull: true },
          ],
          primaryKey: {
            columns: [{ columnName: 'id' }],
          },
          foreignKeys: [{ refTableName: 't1', columns: [{ columnName: 'valfk', refColumnName: 'id' }] }],
        })
      );

      const gett1 = () =>
        stream.Readable.from([
          { __isStreamHeader: true, __isDynamicStructure: true },
          { id: 1, val: 'v1' },
          { id: 2, val: 'v2' },
          { id: 3, val: 'v3' },
        ]);
      const gett2 = () =>
        stream.Readable.from([
          { __isStreamHeader: true, __isDynamicStructure: true },
          { id: 1, val: 'v1', valfk: 1 },
          { id: 2, val: 'v2', valfk: 2 },
          { id: 3, val: 'v3', valfk: 3 },
        ]);

      await dataDuplicator({
        systemConnection: conn,
        driver,
        items: [
          {
            name: 't1',
            operation: 'copy',
            openStream: gett1,
          },
          {
            name: 't2',
            operation: 'copy',
            openStream: gett2,
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
            openStream: gett1,
          },
          {
            name: 't2',
            operation: 'copy',
            openStream: gett2,
          },
        ],
      });

      const res1 = await runQueryOnDriver(conn, driver, dmp => dmp.put(`select count(*) as ~cnt from ~t1`));
      expect(res1.rows[0].cnt.toString()).toEqual('6');

      const res2 = await runQueryOnDriver(conn, driver, dmp => dmp.put(`select count(*) as ~cnt from ~t2`));
      expect(res2.rows[0].cnt.toString()).toEqual('6');
    })
  );

  test.each(engines.filter(x => !x.skipDataDuplicator).map(engine => [engine.label, engine]))(
    'Skip nullable weak refs - %s',
    testWrapper(async (conn, driver, engine) => {
      runCommandOnDriver(conn, driver, dmp =>
        dmp.createTable({
          pureName: 't1',
          columns: [
            { columnName: 'id', dataType: 'int', notNull: true },
            { columnName: 'val', dataType: 'varchar(50)' },
          ],
          primaryKey: {
            columns: [{ columnName: 'id' }],
          },
        })
      );
      runCommandOnDriver(conn, driver, dmp =>
        dmp.createTable({
          pureName: 't2',
          columns: [
            { columnName: 'id', dataType: 'int', autoIncrement: true, notNull: true },
            { columnName: 'val', dataType: 'varchar(50)' },
            { columnName: 'valfk', dataType: 'int', notNull: false },
          ],
          primaryKey: {
            columns: [{ columnName: 'id' }],
          },
          foreignKeys: [{ refTableName: 't1', columns: [{ columnName: 'valfk', refColumnName: 'id' }] }],
        })
      );
      runCommandOnDriver(conn, driver, dmp => dmp.put("insert into ~t1 (~id, ~val) values (1, 'first')"));

      const gett2 = () =>
        stream.Readable.from([
          { __isStreamHeader: true, __isDynamicStructure: true },
          { id: 1, val: 'v1', valfk: 1 },
          { id: 2, val: 'v2', valfk: 2 },
        ]);

      await dataDuplicator({
        systemConnection: conn,
        driver,
        items: [
          {
            name: 't2',
            operation: 'copy',
            openStream: gett2,
          },
        ],
        options: {
          setNullForUnresolvedNullableRefs: true,
        },
      });

      const res1 = await runQueryOnDriver(conn, driver, dmp => dmp.put(`select count(*) as ~cnt from ~t1`));
      expect(res1.rows[0].cnt.toString()).toEqual('1');

      const res2 = await runQueryOnDriver(conn, driver, dmp => dmp.put(`select count(*) as ~cnt from ~t2`));
      expect(res2.rows[0].cnt.toString()).toEqual('2');

      const res3 = await runQueryOnDriver(conn, driver, dmp =>
        dmp.put(`select count(*) as ~cnt from ~t2 where ~valfk is not null`)
      );
      expect(res3.rows[0].cnt.toString()).toEqual('1');
    })
  );
});
