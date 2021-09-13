const stableStringify = require('json-stable-stringify');
const _ = require('lodash');
const fp = require('lodash/fp');
const uuidv1 = require('uuid/v1');
const { testWrapper } = require('../tools');
const engines = require('../engines');
const { getAlterDatabaseScript, extendDatabaseInfo, generateDbPairingId } = require('dbgate-tools');

async function testDatabaseDiff(conn, driver, mangle) {
  await driver.query(conn, `create table t0 (id int not null primary key)`);

  await driver.query(
    conn,
    `create table t1 (
    col_pk int not null primary key, 
    col_fk int null references t0(id)
  )`
  );

  const structure1 = generateDbPairingId(extendDatabaseInfo(await driver.analyseFull(conn)));
  let structure2 = _.cloneDeep(structure1);
  mangle(structure2);
  structure2 = extendDatabaseInfo(structure2);

  const sql = getAlterDatabaseScript(structure1, structure2, {}, structure2, driver);
  console.log('RUNNING ALTER SQL', driver.engine, ':', sql);

  await driver.script(conn, sql);

  const structure2Real = extendDatabaseInfo(await driver.analyseFull(conn));

  expect(structure2Real.tables.length).toEqual(structure2.tables.length);
}

describe('Alter database', () => {
  test.each(engines.map(engine => [engine.label, engine]))(
    'Drop referenced table - %s',
    testWrapper(async (conn, driver, engine) => {
      await testDatabaseDiff(conn, driver, db => {
        _.remove(db.tables, x => x.pureName == 't0');
      });
    })
  );
});
