// Database object names became exported file names as they were, so a table called
// "../../x" (a valid name in most databases) was written outside the export folder.

const os = require('os');
const path = require('path');
const fs = require('fs');

jest.mock('dbgate-tools', () => ({
  tableInfoToYaml: table => ({ name: table.pureName }),
  getSchemasUsedByStructure: model => [...new Set((model.tables || []).map(x => x.schemaName))],
}));

const exportDbModel = require('./exportDbModel');
const exportDbModelSql = require('./exportDbModelSql');
const objectFileName = require('./objectFileName');

const driver = {
  createDumper: () => ({ s: '', createTable() {}, createSqlObject() {}, createForeignKey() {} }),
};

function listFiles(dir) {
  return fs.readdirSync(dir, { recursive: true }).map(x => x.split(path.sep).join('/'));
}

test('objectFileName keeps ordinary names and removes path components', () => {
  expect(objectFileName('orders')).toBe('orders');
  expect(objectFileName('../../etc/x')).not.toMatch(/[\\/]/);
  expect(objectFileName('..')).toBe('__');
  expect(objectFileName('a\\b')).toBe('a_b');
  // characters Windows does not allow in file names
  expect(objectFileName('a*b?c"d<e>f|g:h')).toBe('a_b_c_d_e_f_g_h');
  expect(objectFileName('a\tb\0c')).toBe('a_b_c');
});

test('exportDbModel keeps every file inside the output folder', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dbgate-export-'));
  const outputDir = path.join(root, 'out');
  await exportDbModel(
    { tables: [{ pureName: '../escaped' }], views: [{ pureName: '../../view', createSql: '' }] },
    outputDir
  );

  expect(fs.readdirSync(root)).toEqual(['out']);
  expect(listFiles(outputDir).sort()).toEqual(['.._.._view.view.sql', '.._escaped.table.yaml']);
});

// different objects that would get the same file name used to overwrite each other silently
test('exportDbModel writes every object, also when file names would collide', async () => {
  const outputDir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dbgate-export-')), 'out');
  await exportDbModel(
    {
      tables: [
        { pureName: 'orders', schemaName: 'sales' },
        { pureName: 'orders', schemaName: 'archive' },
        { pureName: 'Orders', schemaName: 'public' },
        { pureName: '..' },
        { pureName: '__' },
      ],
    },
    outputDir
  );

  expect(listFiles(outputDir).sort()).toEqual(
    ['__.table.yaml', '___2.table.yaml', 'Orders_3.table.yaml', 'orders.table.yaml', 'orders_2.table.yaml'].sort()
  );
});

test('exportDbModelSql gives schemas and objects with colliding names their own files', async () => {
  const outputDir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dbgate-export-sql-')), 'out');
  await exportDbModelSql(
    {
      tables: [
        { pureName: 't', schemaName: 'a/b' },
        { pureName: 't', schemaName: 'a\\b' },
        { pureName: 'x', schemaName: 'public' },
        { pureName: 'X', schemaName: 'public' },
      ],
    },
    driver,
    outputDir,
    null
  );

  expect(listFiles(outputDir).filter(x => x.endsWith('.sql')).sort()).toEqual(
    ['a_b/tables/t.sql', 'a_b_2/tables/t.sql', 'public/tables/X_2.sql', 'public/tables/x.sql'].sort()
  );
});

test('exportDbModelSql keeps every file inside the output folder, schema names included', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dbgate-export-sql-'));
  const outputDir = path.join(root, 'out');
  await exportDbModelSql(
    {
      tables: [
        { pureName: '../escaped', schemaName: '..' },
        { pureName: 't', schemaName: 'public' },
      ],
    },
    driver,
    outputDir,
    null
  );

  expect(fs.readdirSync(root)).toEqual(['out']);
  expect(listFiles(outputDir)).toEqual(expect.arrayContaining(['__/tables/.._escaped.sql', 'public/tables/t.sql']));
});
