const stableStringify = require('json-stable-stringify');
const _ = require('lodash');
const fp = require('lodash/fp');
const uuidv1 = require('uuid/v1');
const { testWrapper } = require('../tools');
const engines = require('../engines');
const { getAlterDatabaseScript, extendDatabaseInfo, generateDbPairingId } = require('dbgate-tools');

function flatSource() {
  return _.flatten(
    engines.map(engine => (engine.objects || []).map(object => [engine.label, object.type, object, engine]))
  );
}

async function testDatabaseDiff(conn, driver, mangle, createObject = null) {
  await driver.query(conn, `create table t1 (id int not null primary key)`);

  await driver.query(
    conn,
    `create table t2 (
    id int not null primary key, 
    t1_id int null references t1(id)
  )`
  );

  if (createObject) await driver.query(conn, createObject);

  const structure1 = generateDbPairingId(extendDatabaseInfo(await driver.analyseFull(conn)));
  let structure2 = _.cloneDeep(structure1);
  mangle(structure2);
  structure2 = extendDatabaseInfo(structure2);

  const { sql } = getAlterDatabaseScript(structure1, structure2, {}, structure2, driver);
  console.log('RUNNING ALTER SQL', driver.engine, ':', sql);

  await driver.script(conn, sql);

  const structure2Real = extendDatabaseInfo(await driver.analyseFull(conn));

  expect(structure2Real.tables.length).toEqual(structure2.tables.length);
  return structure2Real;
}

describe('Alter database', () => {
  test.each(engines.map(engine => [engine.label, engine]))(
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
        object.create1
      );
      expect(db[type].length).toEqual(0);
    })
  );
});
