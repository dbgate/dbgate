const { escapeSqlString } = require('./stringTools');
const { DatabaseAnalyser } = require('./DatabaseAnalyser');

// Regression tests for values put into the database structure queries.
//
// Database and schema names (from the client), object names and ids (from the database itself)
// were put into string literals of the analyser queries without escaping, e.g.
//   where TABLE_SCHEMA = '#DATABASE#'
// so a database named  x' or '1'='1  changed the query.

const standardDialect = { stringEscapeChar: "'" };
const backslashDialect = { stringEscapeChar: '\\' };

describe('escapeSqlString', () => {
  test('doubles quotes for standard SQL', () => {
    expect(escapeSqlString("it's", "'")).toBe("it''s");
    expect(escapeSqlString("x' or '1'='1", "'")).toBe("x'' or ''1''=''1");
  });

  test('escapes quotes and backslashes when backslash is the escape character', () => {
    expect(escapeSqlString("it's", '\\')).toBe("it\\'s");
    // a trailing backslash must not escape the closing quote
    expect(escapeSqlString("x\\' or 1=1 -- ", '\\')).toBe("x\\\\\\' or 1=1 -- ");
  });
});

function createAnalyser(database, dialect = standardDialect) {
  return new DatabaseAnalyser({ database } as any, { dialect } as any, null);
}

describe('DatabaseAnalyser queries', () => {
  test('a schema name in a composite database name is escaped', () => {
    const analyser = createAnalyser("db::sch' or '1'='1");
    const query = analyser.createQuery('select * from t where schema_name =SCHEMA_NAME_CONDITION', null);
    expect(query).toBe("select * from t where schema_name = 'sch'' or ''1''=''1' ");
  });

  test('an object id is escaped', () => {
    const analyser = createAnalyser('db');
    analyser.singleObjectFilter = { typeField: 'tables', pureName: 'x' };
    analyser.singleObjectId = "1' or '1'='1";
    const query = analyser.createQuery('select * from t where id =OBJECT_ID_CONDITION', ['tables']);
    expect(query).toBe("select * from t where id  = '1'' or ''1''=''1'");
  });

  test('object ids of modifications are escaped', () => {
    const analyser = createAnalyser('db');
    analyser.modifications = [{ objectTypeField: 'tables', action: 'change', objectId: "a'b" } as any];
    const query = analyser.createQuery('select * from t where id =OBJECT_ID_CONDITION', ['tables']);
    expect(query).toBe("select * from t where id  in ('a''b')");
  });

  test('a database name placeholder is escaped for the dialect', () => {
    expect(createAnalyser('').replaceStringPlaceholder("where db = '#DATABASE#'", '#DATABASE#', "x' or '1'='1")).toBe(
      "where db = 'x'' or ''1''=''1'"
    );
    expect(
      createAnalyser('', backslashDialect).replaceStringPlaceholder("where db = '#DATABASE#'", '#DATABASE#', "x\\'")
    ).toBe("where db = 'x\\\\\\''");
  });

  test('replacement values are inserted literally', () => {
    // String.prototype.replace interprets $& and $' in a replacement string
    const analyser = createAnalyser('');
    expect(analyser.replaceStringPlaceholder("'#DATABASE#'", '#DATABASE#', "$'$&")).toBe("'$''$&'");
    expect(analyser.processQueryReplacements("owner = '$owner'", { $owner: "$'" })).toBe("owner = '$''");
  });
});
