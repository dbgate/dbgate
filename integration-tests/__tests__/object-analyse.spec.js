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

function flatSourceTriggers() {
  return _.flatten(engines.map(engine => (engine.triggers || []).map(trigger => [engine.label, trigger, engine])));
}

function flatSourceSchedulerEvents() {
  return _.flatten(
    engines.map(engine => (engine.schedulerEvents || []).map(schedulerEvent => [engine.label, schedulerEvent, engine]))
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

  const flatParameters = flatSourceParameters();

  if (flatParameters.length > 0) {
    test.each(flatParameters)(
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

    test.each(flatParameters)(
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
  }

  test.each(flatSourceTriggers())(
    'Test triggers - %s - %s',
    testWrapper(async (conn, driver, trigger) => {
      for (const sql of initSql) await runCommandOnDriver(conn, driver, sql);

      const { triggerOtherDropSql, triggerOtherCreateSql, create, drop, expected, objectTypeField } = trigger;

      if (triggerOtherCreateSql) await runCommandOnDriver(conn, driver, triggerOtherCreateSql);

      await runCommandOnDriver(conn, driver, create);
      const structure = await driver.analyseFull(conn);
      await runCommandOnDriver(conn, driver, drop);

      if (triggerOtherDropSql) await runCommandOnDriver(conn, driver, triggerOtherDropSql);

      const createdTrigger = structure[objectTypeField].find(x => x.pureName == expected.pureName);
      expect(createdTrigger).toEqual(expect.objectContaining(expected));

      // test trigger createSql
      if (triggerOtherCreateSql) await runCommandOnDriver(conn, driver, triggerOtherCreateSql);

      await driver.script(conn, createdTrigger.createSql);
      const structure2 = await driver.analyseFull(conn);
      const createdTrigger2 = structure2[objectTypeField].find(x => x.pureName == expected.pureName);
      expect(createdTrigger2).toEqual(expect.objectContaining(expected));
    })
  );

  const schedulerEvents = flatSourceSchedulerEvents();
  if (schedulerEvents.length > 0) {
    test.each(schedulerEvents)(
      'Test scheduler events - %s - %s',
      testWrapper(async (conn, driver, event) => {
        for (const sql of initSql) await runCommandOnDriver(conn, driver, sql);
        const { create, drop, objectTypeField, expected } = event;

        await runCommandOnDriver(conn, driver, create);
        const structure = await driver.analyseFull(conn);
        await runCommandOnDriver(conn, driver, drop);

        const createdEvent = structure[objectTypeField].find(x => x.pureName == expected.pureName);
        expect(createdEvent).toEqual(expect.objectContaining(expected));
      })
    );
  }
});
