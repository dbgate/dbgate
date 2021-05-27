const { connect, randomDbName } = require('../tools');
const requireEngineDriver = require('dbgate-api/src/utility/requireEngineDriver');
const engines = require('../engines');
const _ = require('lodash');

const initSql = ['CREATE TABLE t1 (id int)', 'CREATE TABLE t2 (id int)'];

function flatSource() {
  return _.flatten(
    engines.map(engine => (engine.objects || []).map(object => [engine.label, object.type, engine, object]))
  );
}

const obj1Match = expect.objectContaining({
  pureName: 'obj1',
});

describe('Object analyse', () => {
  test.each(flatSource())('Full analysis (%s - %s)', async (label, type, engine, object) => {
    const conn = await connect(engine, randomDbName());
    const driver = requireEngineDriver(engine.connection);
    for (const sql of initSql) await driver.query(conn, sql);

    await driver.query(conn, object.create1);
    const structure = await driver.analyseFull(conn);

    expect(structure[type].length).toEqual(1);
    expect(structure[type][0]).toEqual(obj1Match);
    await driver.close(conn);
  });

  test.each(flatSource())('Incremental analysis - add (%s - %s)', async (label, type, engine, object) => {
    const conn = await connect(engine, randomDbName());
    const driver = requireEngineDriver(engine.connection);
    for (const sql of initSql) await driver.query(conn, sql);

    await driver.query(conn, object.create2);
    const structure1 = await driver.analyseFull(conn);
    await driver.query(conn, object.create1);
    const structure2 = await driver.analyseIncremental(conn, structure1);

    expect(structure2[type].length).toEqual(2);
    expect(structure2[type].find(x => x.pureName == 'obj1')).toEqual(obj1Match);
    await driver.close(conn);
  });

  test.each(flatSource())('Incremental analysis - drop (%s - %s)', async (label, type, engine, object) => {
    const conn = await connect(engine, randomDbName());
    const driver = requireEngineDriver(engine.connection);
    for (const sql of initSql) await driver.query(conn, sql);

    await driver.query(conn, object.create1);
    await driver.query(conn, object.create2);
    const structure1 = await driver.analyseFull(conn);
    await driver.query(conn, object.drop2);
    const structure2 = await driver.analyseIncremental(conn, structure1);

    expect(structure2[type].length).toEqual(1);
    expect(structure2[type][0]).toEqual(obj1Match);
    await driver.close(conn);
  });
});
