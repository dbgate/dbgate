const { testWrapper } = require('../tools');
const engines = require('../engines');
const _ = require('lodash');

const initSql = ['CREATE TABLE t1 (id int)', 'CREATE TABLE t2 (id int)'];

function flatSource() {
  return _.flatten(
    engines.map(engine => (engine.objects || []).map(object => [engine.label, object.type, object, engine]))
  );
}

const obj1Match = expect.objectContaining({
  pureName: 'obj1',
});
const view1Match = expect.objectContaining({
  pureName: 'obj1',
  columns: [
    expect.objectContaining({
      columnName: 'id',
    }),
  ],
});

describe('Object analyse', () => {
  test.each(flatSource())(
    'Full analysis - %s - %s',
    testWrapper(async (conn, driver, type, object, engine) => {
      for (const sql of initSql) await driver.query(conn, sql);

      await driver.query(conn, object.create1);
      const structure = await driver.analyseFull(conn);

      expect(structure[type].length).toEqual(1);
      expect(structure[type][0]).toEqual(type == 'views' ? view1Match : obj1Match);
    })
  );

  test.each(flatSource())(
    'Incremental analysis - add - %s - %s',
    testWrapper(async (conn, driver, type, object, engine) => {
      for (const sql of initSql) await driver.query(conn, sql);

      await driver.query(conn, object.create2);
      const structure1 = await driver.analyseFull(conn);
      await driver.query(conn, object.create1);
      const structure2 = await driver.analyseIncremental(conn, structure1);

      expect(structure2[type].length).toEqual(2);
      expect(structure2[type].find(x => x.pureName == 'obj1')).toEqual(type == 'views' ? view1Match : obj1Match);
    })
  );

  test.each(flatSource())(
    'Incremental analysis - drop - %s - %s',
    testWrapper(async (conn, driver, type, object, engine) => {
      for (const sql of initSql) await driver.query(conn, sql);

      await driver.query(conn, object.create1);
      await driver.query(conn, object.create2);
      const structure1 = await driver.analyseFull(conn);
      await driver.query(conn, object.drop2);
      const structure2 = await driver.analyseIncremental(conn, structure1);

      expect(structure2[type].length).toEqual(1);
      expect(structure2[type][0]).toEqual(type == 'views' ? view1Match : obj1Match);
    })
  );

  test.each(flatSource())(
    'Create SQL - add - %s - %s',
    testWrapper(async (conn, driver, type, object, engine) => {
      for (const sql of initSql) await driver.query(conn, sql);

      await driver.query(conn, object.create1);
      const structure1 = await driver.analyseFull(conn);
      await driver.query(conn, object.drop1);
      const structure2 = await driver.analyseIncremental(conn, structure1);
      expect(structure2[type].length).toEqual(0);

      await driver.query(conn, structure1[type][0].createSql);

      const structure3 = await driver.analyseIncremental(conn, structure2);

      expect(structure3[type].length).toEqual(1);
      expect(structure3[type][0]).toEqual(type == 'views' ? view1Match : obj1Match);
    })
  );
});
