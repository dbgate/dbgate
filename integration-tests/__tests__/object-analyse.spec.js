const { testWrapper } = require('../tools');
const engines = require('../engines');
const _ = require('lodash');

const initSql = ['CREATE TABLE t1 (id int primary key)', 'CREATE TABLE t2 (id int primary key)'];

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
      for (const sql of initSql) await driver.query(conn, sql, { discardResult: true });

      await driver.query(conn, object.create1, { discardResult: true });
      const structure = await driver.analyseFull(conn);

      expect(structure[type].length).toEqual(1);
      expect(structure[type][0]).toEqual(type.includes('views') ? view1Match : obj1Match);
    })
  );

  test.each(flatSource())(
    'Incremental analysis - add - %s - %s',
    testWrapper(async (conn, driver, type, object, engine) => {
      for (const sql of initSql) await driver.query(conn, sql, { discardResult: true });

      await driver.query(conn, object.create2, { discardResult: true });
      const structure1 = await driver.analyseFull(conn);
      await driver.query(conn, object.create1, { discardResult: true });
      const structure2 = await driver.analyseIncremental(conn, structure1);

      expect(structure2[type].length).toEqual(2);
      expect(structure2[type].find(x => x.pureName == 'obj1')).toEqual(type.includes('views') ? view1Match : obj1Match);
    })
  );

  test.each(flatSource())(
    'Incremental analysis - drop - %s - %s',
    testWrapper(async (conn, driver, type, object, engine) => {
      for (const sql of initSql) await driver.query(conn, sql, { discardResult: true });

      await driver.query(conn, object.create1, { discardResult: true });
      await driver.query(conn, object.create2, { discardResult: true });
      const structure1 = await driver.analyseFull(conn);
      await driver.query(conn, object.drop2, { discardResult: true });
      const structure2 = await driver.analyseIncremental(conn, structure1);

      expect(structure2[type].length).toEqual(1);
      expect(structure2[type][0]).toEqual(type.includes('views') ? view1Match : obj1Match);
    })
  );

  test.each(flatSource())(
    'Create SQL - add - %s - %s',
    testWrapper(async (conn, driver, type, object, engine) => {
      for (const sql of initSql) await driver.query(conn, sql, { discardResult: true });

      await driver.query(conn, object.create1, { discardResult: true });
      const structure1 = await driver.analyseFull(conn);
      await driver.query(conn, object.drop1, { discardResult: true });
      const structure2 = await driver.analyseIncremental(conn, structure1);
      expect(structure2[type].length).toEqual(0);

      await driver.query(conn, structure1[type][0].createSql, { discardResult: true });

      const structure3 = await driver.analyseIncremental(conn, structure2);

      expect(structure3[type].length).toEqual(1);
      expect(structure3[type][0]).toEqual(type.includes('views') ? view1Match : obj1Match);
    })
  );
});
