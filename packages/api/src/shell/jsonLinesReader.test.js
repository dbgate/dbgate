// jsonLinesReader must read rows whose string values contain U+2028 / U+2029 (issue #1636).

const fs = require('fs');
const os = require('os');
const path = require('path');
const stream = require('stream');

// uuid 14 is ESM only; jest can require() it only on Node 24.9+, so keep this suite runnable on older Node
jest.mock('uuid', () => {
  const { randomUUID } = require('crypto');
  return { v1: () => randomUUID(), v4: () => randomUUID() };
});

const jsonLinesReader = require('./jsonLinesReader');

describe('jsonLinesReader', () => {
  let tmpDir;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dbgate-jsonl-reader-test-'));
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('reads row containing U+2028 and U+2029 with exact original value', async () => {
    const value = 'prefix\u2028middle\u2029suffix';
    const fileName = path.join(tmpDir, 'u2028.jsonl');
    const header = { __isStreamHeader: true, columns: [{ columnName: 'TEST' }] };
    fs.writeFileSync(fileName, JSON.stringify(header) + '\n' + JSON.stringify({ TEST: value }) + '\n', 'utf8');

    const pipes = await jsonLinesReader({ fileName });
    // ParseStream calls JSON.parse synchronously in _transform; turn a sync throw into a stream error
    // so the pipeline rejects with the parse error instead of hanging until the jest timeout
    const parser = pipes[pipes.length - 1];
    const origTransform = parser._transform.bind(parser);
    parser._transform = (chunk, enc, done) => {
      try {
        origTransform(chunk, enc, done);
      } catch (err) {
        done(err);
      }
    };
    const rows = [];
    await stream.promises.pipeline(
      ...pipes,
      new stream.Writable({
        objectMode: true,
        write(obj, _enc, done) {
          rows.push(obj);
          done();
        },
      })
    );

    expect(rows).toHaveLength(2);
    expect(rows[0].__isStreamHeader).toBe(true);
    expect(rows[1]).toEqual({ TEST: value });
    expect(rows[1].TEST).toBe(value);
  });
});
