const stableStringify = require('json-stable-stringify');
const _ = require('lodash');
const fp = require('lodash/fp');
const { testWrapper } = require('../tools');
const engines = require('../engines');
const { runCommandOnDriver } = require('dbgate-tools');

describe('Schema tests', () => {
  test.each(engines.filter(x => x.supportSchemas).map(engine => [engine.label, engine]))(
    'Create schema - %s',
    testWrapper(async (conn, driver, engine) => {
      const structure1 = await driver.analyseFull(conn);
      expect(structure1.schemas.find(x => x.schemaName == 'myschema')).toBeFalsy();
      await runCommandOnDriver(conn, driver, dmp => dmp.createSchema('myschema'));
      const structure2 = await driver.analyseIncremental(conn, structure1);
      expect(structure2.schemas.find(x => x.schemaName == 'myschema')).toBeTruthy();
    })
  );

  test.each(engines.filter(x => x.supportSchemas).map(engine => [engine.label, engine]))(
    'Drop schema - %s',
    testWrapper(async (conn, driver, engine) => {
      await runCommandOnDriver(conn, driver, dmp => dmp.createSchema('myschema'));

      const structure1 = await driver.analyseFull(conn);
      expect(structure1.schemas.find(x => x.schemaName == 'myschema')).toBeTruthy();
      await runCommandOnDriver(conn, driver, dmp => dmp.dropSchema('myschema'));
      const structure2 = await driver.analyseIncremental(conn, structure1);
      expect(structure2.schemas.find(x => x.schemaName == 'myschema')).toBeFalsy();
    })
  );
});

describe('Base analyser test', () => {
  test.each(engines.map(engine => [engine.label, engine]))(
    'Structure without change - %s',
    testWrapper(async (conn, driver, engine) => {
      await driver.query(conn, `create table t1 (id int not null primary key)`);

      await driver.query(
        conn,
        `create table t2 (
          id int not null primary key, 
          t1_id int null references t1(id)
        )`
      );

      const structure1 = await driver.analyseFull(conn);
      const structure2 = await driver.analyseIncremental(conn, structure1);
      expect(structure2).toBeNull();
    })
  );
});
