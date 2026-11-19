// Regression test for #1631: on SQL Server, sys.types only lists user-defined (alias) types the login
// has permission on, so an INNER JOIN on it silently dropped every column using such a type for
// read-only logins. The query must keep those columns and fall back to the base type name.

const sql = require('./columns');

describe('mssql columns query', () => {
  const normalized = sql.replace(/\s+/g, ' ');

  test('does not drop columns whose user-defined type is not visible', () => {
    expect(normalized).not.toMatch(/inner join sys\.types/i);
    expect(normalized).toMatch(/left join sys\.types/i);
  });

  test('falls back to the base type name when the alias type is not visible', () => {
    expect(normalized).toMatch(/COALESCE\(t\.name, TYPE_NAME\(c\.system_type_id\)\) as dataType/i);
  });

  test('does not drop columns missing from INFORMATION_SCHEMA.COLUMNS', () => {
    expect(normalized).not.toMatch(/inner join INFORMATION_SCHEMA\.COLUMNS/i);
  });
});
