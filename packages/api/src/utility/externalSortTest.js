'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { sortFile } = require('./externalSort');

// ── helpers ──────────────────────────────────────────────────────────────────

function tmpFile() {
  return path.join(os.tmpdir(), `externalSortTest-${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`);
}

function writeJsonl(filePath, rows) {
  const content = rows.map(r => JSON.stringify(r)).join('\n');
  fs.writeFileSync(filePath, rows.length ? content + '\n' : '');
}

function readJsonl(filePath) {
  return fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .filter(l => l.trim())
    .map(l => JSON.parse(l));
}

async function withTmpPair(fn) {
  const inFile = tmpFile();
  const outFile = tmpFile();
  try {
    await fn(inFile, outFile);
  } finally {
    for (const f of [inFile, outFile]) {
      try { fs.unlinkSync(f); } catch { /* best-effort */ }
    }
  }
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('externalSort', () => {

  // ── Basic sorts ────────────────────────────────────────────────────────────

  test('sorts numbers ASC', async () => {
    await withTmpPair(async (inFile, outFile) => {
      writeJsonl(inFile, [{ id: 3 }, { id: 1 }, { id: 2 }]);
      await sortFile(inFile, outFile, [{ uniqueName: 'id', order: 'ASC' }]);
      expect(readJsonl(outFile).map(r => r.id)).toEqual([1, 2, 3]);
    });
  });

  test('sorts numbers DESC', async () => {
    await withTmpPair(async (inFile, outFile) => {
      writeJsonl(inFile, [{ id: 1 }, { id: 3 }, { id: 2 }]);
      await sortFile(inFile, outFile, [{ uniqueName: 'id', order: 'DESC' }]);
      expect(readJsonl(outFile).map(r => r.id)).toEqual([3, 2, 1]);
    });
  });

  test('sorts strings ASC', async () => {
    await withTmpPair(async (inFile, outFile) => {
      writeJsonl(inFile, [{ name: 'Zebra' }, { name: 'Apple' }, { name: 'Mango' }]);
      await sortFile(inFile, outFile, [{ uniqueName: 'name', order: 'ASC' }]);
      expect(readJsonl(outFile).map(r => r.name)).toEqual(['Apple', 'Mango', 'Zebra']);
    });
  });

  test('sorts strings DESC', async () => {
    await withTmpPair(async (inFile, outFile) => {
      writeJsonl(inFile, [{ name: 'Zebra' }, { name: 'Apple' }, { name: 'Mango' }]);
      await sortFile(inFile, outFile, [{ uniqueName: 'name', order: 'DESC' }]);
      expect(readJsonl(outFile).map(r => r.name)).toEqual(['Zebra', 'Mango', 'Apple']);
    });
  });

  // ── Multi-field sort ────────────────────────────────────────────────────────

  test('sorts by multiple fields (primary ASC, secondary DESC)', async () => {
    await withTmpPair(async (inFile, outFile) => {
      writeJsonl(inFile, [
        { category: 'B', value: 1 },
        { category: 'A', value: 2 },
        { category: 'A', value: 5 },
        { category: 'B', value: 3 },
      ]);
      await sortFile(inFile, outFile, [
        { uniqueName: 'category', order: 'ASC' },
        { uniqueName: 'value', order: 'DESC' },
      ]);
      const rows = readJsonl(outFile);
      expect(rows.map(r => [r.category, r.value])).toEqual([['A', 5], ['A', 2], ['B', 3], ['B', 1]]);
    });
  });

  // ── With stream header ──────────────────────────────────────────────────────

  test('with header: header is first row, data rows are sorted', async () => {
    await withTmpPair(async (inFile, outFile) => {
      writeJsonl(inFile, [
        { __isStreamHeader: true, title: 'dataset' },
        { id: 3, val: 'c' },
        { id: 1, val: 'a' },
        { id: 2, val: 'b' },
      ]);
      await sortFile(inFile, outFile, [{ uniqueName: 'id', order: 'ASC' }]);
      const rows = readJsonl(outFile);
      expect(rows[0].__isStreamHeader).toBe(true);
      expect(rows.slice(1).map(r => r.id)).toEqual([1, 2, 3]);
    });
  });

  test('with header: header fields are preserved intact', async () => {
    await withTmpPair(async (inFile, outFile) => {
      writeJsonl(inFile, [
        { __isStreamHeader: true, columns: ['a', 'b'], extra: 42 },
        { a: 2, b: 'x' },
        { a: 1, b: 'y' },
      ]);
      await sortFile(inFile, outFile, [{ uniqueName: 'a', order: 'ASC' }]);
      const rows = readJsonl(outFile);
      expect(rows[0]).toEqual({ __isStreamHeader: true, columns: ['a', 'b'], extra: 42 });
    });
  });

  test('with header + multi-field sort', async () => {
    await withTmpPair(async (inFile, outFile) => {
      writeJsonl(inFile, [
        { __isStreamHeader: true },
        { dept: 'HR', salary: 50000 },
        { dept: 'IT', salary: 80000 },
        { dept: 'HR', salary: 70000 },
        { dept: 'IT', salary: 60000 },
      ]);
      await sortFile(inFile, outFile, [
        { uniqueName: 'dept', order: 'ASC' },
        { uniqueName: 'salary', order: 'DESC' },
      ]);
      const rows = readJsonl(outFile);
      expect(rows[0].__isStreamHeader).toBe(true);
      expect(rows.slice(1).map(r => [r.dept, r.salary])).toEqual([
        ['HR', 70000],
        ['HR', 50000],
        ['IT', 80000],
        ['IT', 60000],
      ]);
    });
  });

  // ── Without stream header ───────────────────────────────────────────────────

  test('without header: all rows sorted, no header injected', async () => {
    await withTmpPair(async (inFile, outFile) => {
      writeJsonl(inFile, [{ x: 30 }, { x: 10 }, { x: 20 }]);
      await sortFile(inFile, outFile, [{ uniqueName: 'x', order: 'ASC' }]);
      const rows = readJsonl(outFile);
      expect(rows.length).toBe(3);
      expect(rows[0].__isStreamHeader).toBeFalsy();
      expect(rows.map(r => r.x)).toEqual([10, 20, 30]);
    });
  });

  // ── Edge cases ───────────────────────────────────────────────────────────────

  test('edge: empty file produces empty output', async () => {
    await withTmpPair(async (inFile, outFile) => {
      fs.writeFileSync(inFile, '');
      await sortFile(inFile, outFile, [{ uniqueName: 'id', order: 'ASC' }]);
      expect(fs.readFileSync(outFile, 'utf8')).toBe('');
    });
  });

  test('edge: single data row is passed through unchanged', async () => {
    await withTmpPair(async (inFile, outFile) => {
      writeJsonl(inFile, [{ id: 42, msg: 'only one' }]);
      await sortFile(inFile, outFile, [{ uniqueName: 'id', order: 'ASC' }]);
      const rows = readJsonl(outFile);
      expect(rows.length).toBe(1);
      expect(rows[0].id).toBe(42);
    });
  });

  test('edge: header-only file (no data rows) produces only header', async () => {
    await withTmpPair(async (inFile, outFile) => {
      writeJsonl(inFile, [{ __isStreamHeader: true, columns: ['a', 'b'] }]);
      await sortFile(inFile, outFile, [{ uniqueName: 'a', order: 'ASC' }]);
      const rows = readJsonl(outFile);
      expect(rows.length).toBe(1);
      expect(rows[0].__isStreamHeader).toBe(true);
    });
  });

  test('edge: all rows have equal sort key — all rows preserved', async () => {
    await withTmpPair(async (inFile, outFile) => {
      writeJsonl(inFile, [
        { score: 10, label: 'a' },
        { score: 10, label: 'b' },
        { score: 10, label: 'c' },
      ]);
      await sortFile(inFile, outFile, [{ uniqueName: 'score', order: 'ASC' }]);
      const rows = readJsonl(outFile);
      expect(rows.length).toBe(3);
      expect(rows.every(r => r.score === 10)).toBe(true);
    });
  });

  test('edge: invalid JSON lines are skipped gracefully', async () => {
    await withTmpPair(async (inFile, outFile) => {
      fs.writeFileSync(inFile, '{"id":3}\nNOT_JSON\n{"id":1}\n{"id":2}\n');
      await sortFile(inFile, outFile, [{ uniqueName: 'id', order: 'ASC' }]);
      const rows = readJsonl(outFile);
      expect(rows.map(r => r.id)).toEqual([1, 2, 3]);
    });
  });

  test('edge: blank lines in input are ignored', async () => {
    await withTmpPair(async (inFile, outFile) => {
      fs.writeFileSync(inFile, '{"id":2}\n\n{"id":1}\n\n');
      await sortFile(inFile, outFile, [{ uniqueName: 'id', order: 'ASC' }]);
      const rows = readJsonl(outFile);
      expect(rows.map(r => r.id)).toEqual([1, 2]);
    });
  });

  test('edge: rows missing sort key field are included in output', async () => {
    await withTmpPair(async (inFile, outFile) => {
      writeJsonl(inFile, [
        { id: 2, name: 'Bob' },
        { name: 'Alice' },         // no id field
        { id: 1, name: 'Charlie' },
      ]);
      await sortFile(inFile, outFile, [{ uniqueName: 'id', order: 'ASC' }]);
      const rows = readJsonl(outFile);
      expect(rows.length).toBe(3);
      expect(rows.find(r => r.name === 'Alice')).toBeTruthy();
      expect(rows.find(r => r.id === 1)).toBeTruthy();
      expect(rows.find(r => r.id === 2)).toBeTruthy();
    });
  });

  test('edge: unicode values are preserved correctly', async () => {
    await withTmpPair(async (inFile, outFile) => {
      writeJsonl(inFile, [
        { word: 'über' },
        { word: 'apple' },
        { word: 'éclair' },
      ]);
      await sortFile(inFile, outFile, [{ uniqueName: 'word', order: 'ASC' }]);
      const rows = readJsonl(outFile);
      expect(rows.length).toBe(3);
      const words = new Set(rows.map(r => r.word));
      expect(words.has('über')).toBe(true);
      expect(words.has('apple')).toBe(true);
      expect(words.has('éclair')).toBe(true);
    });
  });

  test('edge: two rows with same primary key, different secondary key', async () => {
    await withTmpPair(async (inFile, outFile) => {
      writeJsonl(inFile, [
        { pk: 'a', sk: 2 },
        { pk: 'b', sk: 1 },
        { pk: 'a', sk: 1 },
      ]);
      await sortFile(inFile, outFile, [
        { uniqueName: 'pk', order: 'ASC' },
        { uniqueName: 'sk', order: 'ASC' },
      ]);
      const rows = readJsonl(outFile);
      expect(rows.map(r => [r.pk, r.sk])).toEqual([['a', 1], ['a', 2], ['b', 1]]);
    });
  });

});

