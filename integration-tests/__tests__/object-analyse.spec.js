const { testWrapper } = require('../tools');
const engines = require('../engines');
const _ = require('lodash');
const { formatQueryWithoutParams, runCommandOnDriver } = require('dbgate-tools');

const initSql = ['CREATE TABLE ~t1 (~id int primary key)', 'CREATE TABLE ~t2 (~id int primary key)'];

function flatSource() {
  return _.flatten(
    engines.map(engine => (engine.objects || []).map(object => [engine.label, object.type, object, engine]))
  );
}

function flatSourceParameters() {
  return _.flatten(
    engines.map(engine =>
      (engine.parameters || []).map(parameter => [engine.label, parameter.testName, parameter, engine])
    )
  );
}

const obj1Match = expect.objectContaining({
  pureName: 'obj1',
});
const view1Match = expect.objectContaining({
  pureName: 'obj1',
  columns: expect.arrayContaining([
    expect.objectContaining({
      columnName: 'id',
    }),
  ]),
});

describe('Object analyse', () => {
  test.each(flatSource())(
    'Full analysis - %s - %s',
    testWrapper(async (conn, driver, type, object, engine) => {
      for (const sql of initSql) await runCommandOnDriver(conn, driver, sql);

      await runCommandOnDriver(conn, driver, object.create1);
      const structure = await driver.analyseFull(conn);

      expect(structure[type].length).toEqual(1);
      expect(structure[type][0]).toEqual(type.includes('views') ? view1Match : obj1Match);
    })
  );

  test.each(flatSource())(
    'Incremental analysis - add - %s - %s',
    testWrapper(async (conn, driver, type, object, engine) => {
      for (const sql of initSql) await runCommandOnDriver(conn, driver, sql);

      await runCommandOnDriver(conn, driver, object.create2);
      const structure1 = await driver.analyseFull(conn);
      await runCommandOnDriver(conn, driver, object.create1);
      const structure2 = await driver.analyseIncremental(conn, structure1);

      expect(structure2[type].length).toEqual(2);
      expect(structure2[type].find(x => x.pureName == 'obj1')).toEqual(type.includes('views') ? view1Match : obj1Match);
    })
  );

  test.each(flatSource())(
    'Incremental analysis - drop - %s - %s',
    testWrapper(async (conn, driver, type, object, engine) => {
      for (const sql of initSql) await runCommandOnDriver(conn, driver, sql);

      await runCommandOnDriver(conn, driver, object.create1);
      await runCommandOnDriver(conn, driver, object.create2);
      const structure1 = await driver.analyseFull(conn);
      await runCommandOnDriver(conn, driver, object.drop2);
      const structure2 = await driver.analyseIncremental(conn, structure1);

      expect(structure2[type].length).toEqual(1);
      expect(structure2[type][0]).toEqual(type.includes('views') ? view1Match : obj1Match);
    })
  );

  test.each(flatSource())(
    'Create SQL - add - %s - %s',
    testWrapper(async (conn, driver, type, object, engine) => {
      for (const sql of initSql) await runCommandOnDriver(conn, driver, sql);

      await runCommandOnDriver(conn, driver, object.create1);
      const structure1 = await driver.analyseFull(conn);
      await runCommandOnDriver(conn, driver, object.drop1);
      const structure2 = await driver.analyseIncremental(conn, structure1);
      expect(structure2[type].length).toEqual(0);

      await driver.script(conn, structure1[type][0].createSql);

      const structure3 = await driver.analyseIncremental(conn, structure2);

      expect(structure3[type].length).toEqual(1);
      expect(structure3[type][0]).toEqual(type.includes('views') ? view1Match : obj1Match);
    })
  );

  test.each(flatSourceParameters())(
    'Test parameters simple analyse - %s - %s',
    testWrapper(async (conn, driver, testName, parameter, engine) => {
      for (const sql of initSql) await runCommandOnDriver(conn, driver, sql);
      for (const sql of engine.parametersOtherSql) await runCommandOnDriver(conn, driver, sql);

      await runCommandOnDriver(conn, driver, parameter.create);
      const structure = await driver.analyseFull(conn);

      const parameters = structure[parameter.objectTypeField].find(x => x.pureName == 'obj1').parameters;

      expect(parameters.length).toEqual(parameter.list.length);
      for (let i = 0; i < parameters.length; i += 1) {
        expect(parameters[i]).toEqual(expect.objectContaining(parameter.list[i]));
      }
    })
  );

  test.each(flatSourceParameters())(
    'Test parameters create SQL - %s - %s',
    testWrapper(async (conn, driver, testName, parameter, engine) => {
      for (const sql of initSql) await runCommandOnDriver(conn, driver, sql);
      for (const sql of engine.parametersOtherSql) await runCommandOnDriver(conn, driver, sql);

      await runCommandOnDriver(conn, driver, parameter.create);
      const structure1 = await driver.analyseFull(conn);
      await runCommandOnDriver(conn, driver, parameter.drop);

      const obj = structure1[parameter.objectTypeField].find(x => x.pureName == 'obj1');
      await driver.script(conn, obj.createSql, { discardResult: true });

      const structure2 = await driver.analyseFull(conn);
      const parameters = structure2[parameter.objectTypeField].find(x => x.pureName == 'obj1').parameters;

      expect(parameters.length).toEqual(parameter.list.length);
      for (let i = 0; i < parameters.length; i += 1) {
        expect(parameters[i]).toEqual(expect.objectContaining(parameter.list[i]));
      }
    })
  );
});
