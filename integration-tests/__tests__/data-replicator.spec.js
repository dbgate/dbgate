const engines = require('../engines');
const stream = require('stream');
const { testWrapper } = require('../tools');
const dataReplicator = require('dbgate-api/src/shell/dataReplicator');
const deployDb = require('dbgate-api/src/shell/deployDb');
const storageModel = require('dbgate-api/src/storageModel');
const { runCommandOnDriver, runQueryOnDriver } = require('dbgate-tools');

describe('Data replicator', () => {
  test.each(engines.filter(x => !x.skipDataReplicator).map(engine => [engine.label, engine]))(
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

      await dataReplicator({
        systemConnection: conn,
        driver,
        items: [
          {
            name: 't1',
            createNew: true,
            openStream: gett1,
          },
          {
            name: 't2',
            createNew: true,
            openStream: gett2,
          },
        ],
      });

      await dataReplicator({
        systemConnection: conn,
        driver,
        items: [
          {
            name: 't1',
            createNew: true,
            openStream: gett1,
          },
          {
            name: 't2',
            createNew: true,
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

  test.each(engines.filter(x => !x.skipDataReplicator).map(engine => [engine.label, engine]))(
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

      await dataReplicator({
        systemConnection: conn,
        driver,
        items: [
          {
            name: 't2',
            createNew: true,
            jsonArray: [
              { id: 1, val: 'v1', valfk: 1 },
              { id: 2, val: 'v2', valfk: 2 },
            ],
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

  test.each(engines.filter(x => !x.skipDataReplicator).map(engine => [engine.label, engine]))(
    'Import storage DB - %s',
    testWrapper(async (conn, driver, engine) => {
      await deployDb({
        systemConnection: conn,
        driver,
        loadedDbModel: storageModel,
        targetSchema: engine.defaultSchemaName,
      });

      async function queryValue(sql) {
        const res1 = await runQueryOnDriver(conn, driver, dmp => dmp.put(sql));
        return res1.rows[0].val?.toString();
      }

      expect(await queryValue(`select count(*) as ~val from ~auth_methods`)).toEqual('2');
      expect(
        await queryValue(
          `select ~is_disabled as ~val from ~auth_methods where ~amoid='790ca4d2-7f01-4800-955b-d691b890cc50'`
        )
      ).toBeFalsy();

      const DB1 = {
        auth_methods: [
          { id: -1, name: 'Anonymous', amoid: '790ca4d2-7f01-4800-955b-d691b890cc50', is_disabled: 1 },
          { id: 10, name: 'OAuth', amoid: '4269b660-54b6-11ef-a3aa-a9021250bf4b' },
        ],
        auth_methods_config: [{ id: 20, auth_method_id: 10, key: 'oauthClient', value: 'dbgate' }],
        config: [
          { group: 'admin', key: 'encyptKey', value: '1234' },
          { group: 'admin', key: 'adminPasswordState', value: 'set' },
          { group: 'license', key: 'licenseKey', value: '123467' },
        ],
        roles: [
          { id: -3, name: 'superadmin' },
          { id: -2, name: 'logged-user' },
          { id: -1, name: 'anonymous-user' },
        ],
        role_permissions: [
          { id: 14, role_id: -1, permission: 'perm1' },
          { id: 29, role_id: -1, permission: 'perm2' },
          { id: 1, role_id: -1, permission: 'perm3' },
        ],
      };

      const DB2 = {
        auth_methods: [{ id: 10, name: 'My Auth', amoid: 'myauth1' }],
        auth_methods_config: [{ id: 20, auth_method_id: 10, key: 'my authClient', value: 'mydbgate' }],
        config: [],
        roles: [{ id: 1, name: 'test' }],
        role_permissions: [{ id: 14, role_id: 1, permission: 'permxx' }],
      };

      function createDuplConfig(db) {
        return {
          systemConnection: conn,
          driver,
          items: [
            {
              name: 'auth_methods',
              findExisting: true,
              updateExisting: true,
              createNew: true,
              matchColumns: ['amoid'],
              jsonArray: db.auth_methods,
            },
            {
              name: 'auth_methods_config',
              findExisting: true,
              updateExisting: true,
              createNew: true,
              matchColumns: ['auth_method_id', 'key'],
              jsonArray: db.auth_methods_config,
            },
            {
              name: 'config',
              findExisting: true,
              updateExisting: true,
              createNew: true,
              matchColumns: ['group', 'key'],
              jsonArray: db.config,
            },
            {
              name: 'roles',
              findExisting: true,
              updateExisting: true,
              createNew: true,
              matchColumns: ['name'],
              jsonArray: db.roles,
            },
            {
              name: 'role_permissions',
              findExisting: true,
              updateExisting: true,
              createNew: true,
              deleteMissing: true,
              matchColumns: ['role_id', 'permission'],
              deleteRestrictionColumns: ['role_id'],
              jsonArray: db.role_permissions,
            },
          ],
        };
      }

      await dataReplicator(createDuplConfig(DB1));

      expect(
        await queryValue(
          `select ~is_disabled as ~val from ~auth_methods where ~amoid='790ca4d2-7f01-4800-955b-d691b890cc50'`
        )
      ).toBeTruthy();

      expect(await queryValue(`select count(*) as ~val from ~auth_methods`)).toEqual('3');
      expect(await queryValue(`select count(*) as ~val from ~auth_methods_config`)).toEqual('1');
      expect(await queryValue(`select count(*) as ~val from ~config`)).toEqual('3');
      expect(await queryValue(`select ~value as ~val from ~auth_methods_config`)).toEqual('dbgate');
      expect(
        await queryValue(`select ~value as ~val from ~config where ~group='license' and ~key='licenseKey'`)
      ).toEqual('123467');
      expect(await queryValue(`select count(*) as ~val from ~role_permissions`)).toEqual('3');

      DB1.auth_methods_config[0].value = 'dbgate2';
      DB1.config[2].value = '567';
      DB1.role_permissions.splice(2, 1);

      await dataReplicator(createDuplConfig(DB1));
      expect(await queryValue(`select count(*) as ~val from ~auth_methods_config`)).toEqual('1');
      expect(await queryValue(`select count(*) as ~val from ~config`)).toEqual('3');
      expect(await queryValue(`select ~value as ~val from ~auth_methods_config`)).toEqual('dbgate2');
      expect(
        await queryValue(`select ~value as ~val from ~config where ~group='license' and ~key='licenseKey'`)
      ).toEqual('567');
      expect(await queryValue(`select count(*) as ~val from ~role_permissions`)).toEqual('2');

      // now add DB2
      await dataReplicator(createDuplConfig(DB2));

      expect(await queryValue(`select count(*) as ~val from ~auth_methods`)).toEqual('4');
      expect(await queryValue(`select count(*) as ~val from ~auth_methods_config`)).toEqual('2');
      expect(await queryValue(`select count(*) as ~val from ~role_permissions`)).toEqual('3');

      DB1.role_permissions.splice(1, 1);
      await dataReplicator(createDuplConfig(DB1));
      expect(await queryValue(`select count(*) as ~val from ~role_permissions`)).toEqual('2');
    })
  );
});
