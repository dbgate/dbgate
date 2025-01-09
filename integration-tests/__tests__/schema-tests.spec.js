const stableStringify = require('json-stable-stringify');
const _ = require('lodash');
const fp = require('lodash/fp');
const { testWrapper } = require('../tools');
const engines = require('../engines');
const { runCommandOnDriver } = require('dbgate-tools');

async function baseStructure(conn, driver) {
  await driver.query(conn, `create table t1 (id int not null primary key)`);

  await driver.query(
    conn,
    `create table t2 (
        id int not null primary key, 
        t1_id int
      )`
  );
}

describe('Schema tests', () => {
  test.each(engines.filter(x => x.supportSchemas).map(engine => [engine.label, engine]))(
    'Create schema - %s',
    testWrapper(async (conn, driver, engine) => {
      await baseStructure(conn, driver);
      const structure1 = await driver.analyseFull(conn);
      const schemas1 = await driver.listSchemas(conn);
      expect(schemas1.find(x => x.schemaName == 'myschema')).toBeFalsy();
      const count = schemas1.length;
      expect(structure1.tables.length).toEqual(2);
      await runCommandOnDriver(conn, driver, dmp => dmp.createSchema('myschema'));
      const structure2 = await driver.analyseIncremental(conn, structure1);
      const schemas2 = await driver.listSchemas(conn);
      expect(schemas2.find(x => x.schemaName == 'myschema')).toBeTruthy();
      expect(schemas2.length).toEqual(count + 1);
      expect(schemas2.find(x => x.isDefault).schemaName).toEqual(engine.defaultSchemaName);
      expect(structure2).toBeNull();
    })
  );

  test.each(engines.filter(x => x.supportSchemas).map(engine => [engine.label, engine]))(
    'Drop schema - %s',
    testWrapper(async (conn, driver, engine) => {
      await baseStructure(conn, driver);
      await runCommandOnDriver(conn, driver, dmp => dmp.createSchema('myschema'));

      const structure1 = await driver.analyseFull(conn);
      const schemas1 = await driver.listSchemas(conn);
      expect(schemas1.find(x => x.schemaName == 'myschema')).toBeTruthy();
      expect(structure1.tables.length).toEqual(2);
      await runCommandOnDriver(conn, driver, dmp => dmp.dropSchema('myschema'));
      const structure2 = await driver.analyseIncremental(conn, structure1);
      const schemas2 = await driver.listSchemas(conn);
      expect(schemas2.find(x => x.schemaName == 'myschema')).toBeFalsy();
      expect(structure2).toBeNull();
    })
  );

  test.each(engines.filter(x => x.supportSchemas && !x.skipSeparateSchemas).map(engine => [engine.label, engine]))(
    'Table inside schema - %s',
    testWrapper(async (handle, driver, engine) => {
      await baseStructure(handle, driver);
      await runCommandOnDriver(handle, driver, dmp => dmp.createSchema('myschema'));

      const schemaConnDef = {
        ...engine.connection,
        database: `${handle.database}::myschema`,
      };

      const schemaConn = await driver.connect(schemaConnDef);
      await driver.query(schemaConn, `create table myschema.myt1 (id int not null primary key)`);
      const structure1 = await driver.analyseFull(schemaConn);
      expect(structure1.tables.length).toEqual(1);
      expect(structure1.tables[0].pureName).toEqual('myt1');
    })
  );
});

describe('Base analyser test', () => {
  test.each(engines.filter(x => !x.skipIncrementalAnalysis).map(engine => [engine.label, engine]))(
    'Structure without change - %s',
    testWrapper(async (conn, driver, engine) => {
      await baseStructure(conn, driver);

      const structure1 = await driver.analyseFull(conn);
      expect(structure1.tables.length).toEqual(2);
      const structure2 = await driver.analyseIncremental(conn, structure1);
      expect(structure2).toBeNull();
    })
  );
});
