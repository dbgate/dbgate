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
      expect(structure1.schemas.find(x => x.schemaName == 'myschema')).toBeFalsy();
      const count = structure1.schemas.length;
      expect(structure1.tables.length).toEqual(2);
      await runCommandOnDriver(conn, driver, dmp => dmp.createSchema('myschema'));
      const structure2 = await driver.analyseIncremental(conn, structure1);
      expect(structure2.schemas.find(x => x.schemaName == 'myschema')).toBeTruthy();
      expect(structure2.tables.length).toEqual(2);
      expect(structure2.schemas.length).toEqual(count + 1);

      const structure3 = await driver.analyseIncremental(conn, structure2);
      expect(structure3).toBeNull();
    })
  );

  test.each(engines.filter(x => x.supportSchemas).map(engine => [engine.label, engine]))(
    'Drop schema - %s',
    testWrapper(async (conn, driver, engine) => {
      await baseStructure(conn, driver);
      await runCommandOnDriver(conn, driver, dmp => dmp.createSchema('myschema'));

      const structure1 = await driver.analyseFull(conn);
      expect(structure1.schemas.find(x => x.schemaName == 'myschema')).toBeTruthy();
      expect(structure1.tables.length).toEqual(2);
      await runCommandOnDriver(conn, driver, dmp => dmp.dropSchema('myschema'));
      const structure2 = await driver.analyseIncremental(conn, structure1);
      expect(structure2.schemas.find(x => x.schemaName == 'myschema')).toBeFalsy();
      expect(structure2.tables.length).toEqual(2);

      const structure3 = await driver.analyseIncremental(conn, structure2);
      expect(structure3).toBeNull();
    })
  );

  test.each(engines.filter(x => x.supportSchemas).map(engine => [engine.label, engine]))(
    'Create table - keep schemas - %s',
    testWrapper(async (conn, driver, engine) => {
      await baseStructure(conn, driver);
      const structure1 = await driver.analyseFull(conn);
      const count = structure1.schemas.length;
      expect(structure1.tables.length).toEqual(2);
      await driver.query(conn, `create table t3 (id int not null primary key)`);
      const structure2 = await driver.analyseIncremental(conn, structure1);
      expect(structure2.tables.length).toEqual(3);
      expect(structure2.schemas.length).toEqual(count);
    })
  );
});

describe('Base analyser test', () => {
  test.each(engines.map(engine => [engine.label, engine]))(
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
