// Tests for line splitting in lineStream (issue #1636).
// Lines must be split only on \r\n, \n and \r (like Node readline / JSONL);
// U+2028, U+2029, U+0085, \v and \f must stay inside the line.

const stream = require('stream');
const { createLineStream, LineStream } = require('./lineStream');

function collectLines(chunks, options) {
  return new Promise((resolve, reject) => {
    const source = stream.Readable.from(chunks);
    const lineStream = createLineStream(source, options);
    const lines = [];
    lineStream.on('data', line => lines.push(Buffer.isBuffer(line) ? line.toString('utf8') : line));
    lineStream.on('end', () => resolve(lines));
    lineStream.on('error', reject);
    source.on('error', reject);
  });
}

describe('lineStream', () => {
  test('exports createLineStream and LineStream', () => {
    expect(typeof createLineStream).toBe('function');
    expect(new LineStream()).toBeInstanceOf(stream.Transform);
  });

  describe('criterion 1: U+2028 is not a line break', () => {
    test('a\\u2028b\\nc yields two lines', async () => {
      expect(await collectLines(['a\u2028b\nc'])).toEqual(['a\u2028b', 'c']);
    });

    test('a\\u2028b\\nc as UTF-8 buffer yields two lines', async () => {
      expect(await collectLines([Buffer.from('a\u2028b\nc', 'utf8')])).toEqual(['a\u2028b', 'c']);
    });

    test('JSONL row with U+2028 is kept whole and parses', async () => {
      const row = JSON.stringify({ TEST_U2028: 'prefix\u2028suffix' });
      const lines = await collectLines([row + '\n']);
      expect(lines).toEqual([row]);
      expect(JSON.parse(lines[0])).toEqual({ TEST_U2028: 'prefix\u2028suffix' });
    });
  });

  describe('criterion 2: other Unicode/ASCII separators are not line breaks', () => {
    test.each([
      ['U+2029', '\u2029'],
      ['U+0085', '\u0085'],
      ['\\v', '\v'],
      ['\\f', '\f'],
    ])('%s inside a line is kept', async (_name, ch) => {
      const text = `a${ch}b\nc`;
      expect(await collectLines([text])).toEqual([`a${ch}b`, 'c']);
      expect(await collectLines([Buffer.from(text, 'utf8')])).toEqual([`a${ch}b`, 'c']);
    });
  });

  describe('criterion 3: standard line terminators still split', () => {
    test('\\n splits lines', async () => {
      expect(await collectLines(['a\nb\nc\n'])).toEqual(['a', 'b', 'c']);
    });

    test('\\r\\n splits lines', async () => {
      expect(await collectLines(['a\r\nb\r\nc'])).toEqual(['a', 'b', 'c']);
    });

    test('lone \\r splits lines', async () => {
      expect(await collectLines(['a\rb\rc'])).toEqual(['a', 'b', 'c']);
    });

    test('\\r\\n split across two chunks produces one break', async () => {
      expect(await collectLines(['a\r', '\nb'])).toEqual(['a', 'b']);
    });

    test('\\r\\n split across two buffer chunks produces one break (keepEmptyLines)', async () => {
      expect(await collectLines([Buffer.from('a\r'), Buffer.from('\nb')], { keepEmptyLines: true })).toEqual([
        'a',
        'b',
      ]);
    });

    test('line split across chunks is joined', async () => {
      expect(await collectLines(['ab', 'c\nd', 'e'])).toEqual(['abc', 'de']);
    });

    test('empty lines are skipped by default', async () => {
      expect(await collectLines(['a\n\nb\n'])).toEqual(['a', 'b']);
    });
  });

  describe('criterion 4: multi-byte U+2028 split across chunks', () => {
    test('UTF-8 bytes E2 80 A8 split across chunks yield one line containing U+2028', async () => {
      const buf = Buffer.from('x\u2028y\n', 'utf8');
      expect(buf.subarray(1, 4)).toEqual(Buffer.from([0xe2, 0x80, 0xa8]));
      const lines = await collectLines([buf.subarray(0, 2), buf.subarray(2, 3), buf.subarray(3)]);
      expect(lines).toEqual(['x\u2028y']);
    });
  });
});
