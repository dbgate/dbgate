const stableStringify = require('json-stable-stringify');
const _ = require('lodash');
const fp = require('lodash/fp');
const { testWrapper } = require('../tools');
const engines = require('../engines');
const {
  getAlterDatabaseScript,
  extendDatabaseInfo,
  generateDbPairingId,
  formatQueryWithoutParams,
  runCommandOnDriver,
} = require('dbgate-tools');

const initSql = ['CREATE TABLE ~t1 (~id int primary key)', 'CREATE TABLE ~t2 (~id int primary key)'];

function flatSource(engineCond = x => !x.skipReferences) {
  return _.flatten(
    engines
      .filter(engineCond)
      .map(engine => (engine.objects || []).map(object => [engine.label, object.type, object, engine]))
  );
}

async function testDatabaseDiff(conn, driver, mangle, createObject = null) {
  await runCommandOnDriver(conn, driver, `create table ~t1 (~id int not null primary key)`);

  await runCommandOnDriver(
    conn,
    driver,
    `create table ~t2 (
    ~id int not null primary key, 
    ~t1_id int null references ~t1(~id)
  )`
  );

  if (createObject) await driver.query(conn, createObject);

  const structure1 = generateDbPairingId(extendDatabaseInfo(await driver.analyseFull(conn)));
  let structure2 = _.cloneDeep(structure1);
  mangle(structure2);
  structure2 = extendDatabaseInfo(structure2);

  const { sql } = getAlterDatabaseScript(structure1, structure2, {}, structure1, structure2, driver);
  console.log('RUNNING ALTER SQL', driver.engine, ':', sql);

  await driver.script(conn, sql);

  const structure2Real = extendDatabaseInfo(await driver.analyseFull(conn));

  expect(structure2Real.tables.length).toEqual(structure2.tables.length);
  return structure2Real;
}

describe('Alter database', () => {
  test.each(engines.filter(x => !x.skipReferences).map(engine => [engine.label, engine]))(
    'Drop referenced table - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDiff(conn, driver, db => {
        _.remove(db.tables, x => x.pureName == 't1');
      });
    })
  );

  test.each(flatSource())(
    'Drop object - %s - %s',
    testWrapper(async (conn, driver, type, object, engine) => {
      const db = await testDatabaseDiff(
        conn,
        driver,
        db => {
          _.remove(db[type], x => x.pureName == 'obj1');
        },
        formatQueryWithoutParams(driver, object.create1)
      );
      expect(db[type].length).toEqual(0);
    })
  );

  test.each(flatSource(x => x.supportRenameSqlObject))(
    'Rename object - %s - %s',
    testWrapper(async (conn, driver, type, object, engine) => {
      for (const sql of initSql) await runCommandOnDriver(conn, driver, sql);

      await runCommandOnDriver(conn, driver, object.create1);

      const structure = extendDatabaseInfo(await driver.analyseFull(conn));

      const dmp = driver.createDumper();
      dmp.renameSqlObject(structure[type][0], 'renamed1');

      await driver.query(conn, dmp.s);

      const structure2 = await driver.analyseFull(conn);
      expect(structure2[type].length).toEqual(1);
      expect(structure2[type][0].pureName).toEqual('renamed1');
    })
  );
});
