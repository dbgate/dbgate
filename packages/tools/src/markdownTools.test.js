const { escapeMarkdownTableCell, formatMarkdownTable } = require('./markdownTools');

// Backslash-heavy values use String.raw so that what you read is exactly the runtime string.
// e.g. String.raw`a\b` is the 3-char string: a, backslash, b

const toText = (row, col) => String(row[col] ?? '');

describe('escapeMarkdownTableCell', () => {
  test('AC1: pipe is escaped as \\|', () => {
    expect(escapeMarkdownTableCell('a|b')).toBe(String.raw`a\|b`);
  });

  test('AC2: single backslash is doubled', () => {
    // input: a\b (one backslash) -> output: a\\b (two backslashes)
    expect(escapeMarkdownTableCell(String.raw`a\b`)).toBe(String.raw`a\\b`);
    expect(escapeMarkdownTableCell('a\\b')).toBe('a\\\\b');
  });

  test('AC2: backslash followed by pipe -> backslash doubled, then pipe escaped', () => {
    // input: a\|b -> output: a\\\|b (three backslashes before the pipe)
    expect(escapeMarkdownTableCell(String.raw`a\|b`)).toBe(String.raw`a\\\|b`);
  });

  test('AC3: LF becomes <br>', () => {
    expect(escapeMarkdownTableCell('line1\nline2')).toBe('line1<br>line2');
  });

  test('AC3: CRLF becomes a single <br>', () => {
    expect(escapeMarkdownTableCell('line1\r\nline2')).toBe('line1<br>line2');
  });

  test('AC3: CR becomes <br>', () => {
    expect(escapeMarkdownTableCell('line1\rline2')).toBe('line1<br>line2');
  });

  test('AC3: mixed line endings each become one <br>', () => {
    expect(escapeMarkdownTableCell('a\nb\r\nc\rd')).toBe('a<br>b<br>c<br>d');
    expect(escapeMarkdownTableCell('a\n\nb')).toBe('a<br><br>b');
  });

  test('AC4: null and undefined -> empty string', () => {
    expect(escapeMarkdownTableCell(null)).toBe('');
    expect(escapeMarkdownTableCell(undefined)).toBe('');
  });

  test('AC4: plain text is unchanged', () => {
    expect(escapeMarkdownTableCell('hello world')).toBe('hello world');
    expect(escapeMarkdownTableCell('')).toBe('');
    expect(escapeMarkdownTableCell('<b>&amp;</b>')).toBe('<b>&amp;</b>');
  });
});

describe('formatMarkdownTable', () => {
  test('AC5: produces exactly the example table from the issue', () => {
    const columns = ['id', 'title', 'note'];
    const rows = [
      { id: 1, title: 'Login broken', note: 'error a|b' },
      { id: 2, title: 'Multi line', note: 'line1\nline2' },
      { id: 3, title: 'Empty', note: '' },
    ];
    const expected = [
      '| id | title | note |',
      '| --- | --- | --- |',
      String.raw`| 1 | Login broken | error a\|b |`,
      '| 2 | Multi line | line1<br>line2 |',
      '| 3 | Empty |  |',
    ].join('\r\n');
    const result = formatMarkdownTable(columns, rows, toText);
    expect(result).toBe(expected);
    expect(result.endsWith('\n')).toBe(false);
  });

  test('AC6: column names are escaped the same way as cells', () => {
    const columns = ['a|b', String.raw`c\d`, 'e\nf'];
    const result = formatMarkdownTable(columns, [], toText);
    const header = result.split('\r\n')[0];
    expect(header).toBe(String.raw`| a\|b | c\\d | e<br>f |`);
  });

  test('AC7: zero rows -> header and separator only', () => {
    expect(formatMarkdownTable(['x', 'y'], [], toText)).toBe('| x | y |\r\n| --- | --- |');
  });

  test('AC7: zero columns -> empty string', () => {
    expect(formatMarkdownTable([], [], toText)).toBe('');
    expect(formatMarkdownTable([], [{ a: 1 }], toText)).toBe('');
  });

  test('AC8: null / undefined row produces a line of empty cells', () => {
    const result = formatMarkdownTable(['a', 'b'], [null, undefined, { a: 1, b: 2 }], toText);
    expect(result).toBe(['| a | b |', '| --- | --- |', '|  |  |', '|  |  |', '| 1 | 2 |'].join('\r\n'));
  });

  test('AC9: getCellText is used for every cell (custom stringifier respected)', () => {
    const calls = [];
    const getCellText = (row, col) => {
      calls.push([row, col]);
      const v = row[col];
      return typeof v === 'number' ? v.toFixed(2) : `<${v}>`;
    };
    const rows = [
      { n: 1, s: 'x' },
      { n: 2.5, s: 'y' },
    ];
    const result = formatMarkdownTable(['n', 's'], rows, getCellText);
    expect(result).toBe(['| n | s |', '| --- | --- |', '| 1.00 | <x> |', '| 2.50 | <y> |'].join('\r\n'));
    expect(calls).toEqual([
      [rows[0], 'n'],
      [rows[0], 's'],
      [rows[1], 'n'],
      [rows[1], 's'],
    ]);
  });

  test('AC9: output of getCellText is escaped', () => {
    const result = formatMarkdownTable(['c'], [{}], () => 'p|q\r\nr');
    expect(result).toBe(String.raw`| c |` + '\r\n| --- |\r\n' + String.raw`| p\|q<br>r |`);
  });
});
