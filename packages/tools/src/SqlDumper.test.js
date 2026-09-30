const { SqlDumper } = require('./SqlDumper');

function createDumper() {
  return new SqlDumper({ dialect: { stringEscapeChar: "'" } });
}

function dumpValue(value) {
  const dmp = createDumper();
  dmp.put('%v', value);
  return dmp.s;
}

describe('SqlDumper.putValue $bigint / $decimal', () => {
  test.each([
    ['123', '123'],
    ['-123', '-123'],
    ['12.50', '12.50'],
    ['.5', '.5'],
    ['1e10', '1e10'],
    ['-1.5E-3', '-1.5E-3'],
  ])('writes well-formed number %s raw', (input, expected) => {
    expect(dumpValue({ $decimal: input })).toEqual(expected);
    expect(dumpValue({ $bigint: input })).toEqual(expected);
  });

  test('writes a number-typed wrapper raw', () => {
    expect(dumpValue({ $bigint: 42 })).toEqual('42');
  });

  test.each([
    ["x' or '1'='1", "'x'' or ''1''=''1'"],
    ['1; drop table users', "'1; drop table users'"],
    ['1 union select 1', "'1 union select 1'"],
    ['NaN', "'NaN'"],
  ])('writes non-numeric content %s as an escaped string literal', (input, expected) => {
    expect(dumpValue({ $decimal: input })).toEqual(expected);
    expect(dumpValue({ $bigint: input })).toEqual(expected);
  });

  test('a login-style query with an injected $decimal stays a single literal', () => {
    const dmp = createDumper();
    dmp.put('select * from users where login = %v', { $decimal: "'' union select 1, 'a', 'b', 'c' -- " });
    expect(dmp.s).toEqual("select * from users where login = ''''' union select 1, ''a'', ''b'', ''c'' -- '");
  });
});
