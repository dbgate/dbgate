const dbgateApi = require('dbgate-api/src/shell');
// const jsonLinesWriter = require('dbgate-api/src/shell/jsonLinesWriter');
const tmp = require('tmp');
// const dbgatePluginCsv = require('dbgate-plugin-csv/src/backend');
const fs = require('fs');
const requirePlugin = require('dbgate-api/src/shell/requirePlugin');

const CSV_DATA = `Issue Number; Title; Github URL; Labels; State; Created At; Updated At; Reporter; Assignee
801; "Does it 'burst' the database on startup or first lUI load ? "; https://github.com/dbgate/dbgate/issues/801; ""; open; 05/23/2024; 05/23/2024; rgarrigue; 
799; "BUG: latest AppImage crashes on opening in Fedora 39"; https://github.com/dbgate/dbgate/issues/799; ""; open; 05/21/2024; 05/24/2024; BenGraham-Git; 
798; "MongoDB write operations fail"; https://github.com/dbgate/dbgate/issues/798; "bug,solved"; open; 05/21/2024; 05/24/2024; mahmed0715; 
797; "BUG: Unable to open SQL files"; https://github.com/dbgate/dbgate/issues/797; "bug"; open; 05/20/2024; 05/21/2024; cesarValdivia; 
795; "BUG: MS SQL Server connection error (KEY_USAGE_BIT_INCORRECT)"; https://github.com/dbgate/dbgate/issues/795; ""; open; 05/20/2024; 05/20/2024; keskinonur; 
794; "GLIBC_2.29' not found and i have 2.31"; https://github.com/dbgate/dbgate/issues/794; ""; closed; 05/20/2024; 05/21/2024; MFdanGM; 
793; "BUG: PostgresSQL doesn't show tables when connected"; https://github.com/dbgate/dbgate/issues/793; ""; open; 05/20/2024; 05/22/2024; stomper013; 
792; "FEAT: Wayland support"; https://github.com/dbgate/dbgate/issues/792; ""; closed; 05/19/2024; 05/21/2024; VosaXalo; 
`;

async function getReaderRows(reader) {
  const jsonLinesFileName = tmp.tmpNameSync();

  const writer = await dbgateApi.jsonLinesWriter({
    fileName: jsonLinesFileName,
  });
  await dbgateApi.copyStream(reader, writer);

  const jsonData = fs.readFileSync(jsonLinesFileName, 'utf-8');
  const rows = jsonData
    .split('\n')
    .filter(x => x.trim() !== '')
    .map(x => JSON.parse(x));

  return rows;
}

test('csv import test', async () => {
  const dbgatePluginCsv = requirePlugin('dbgate-plugin-csv');

  const csvFileName = tmp.tmpNameSync();

  fs.writeFileSync(csvFileName, CSV_DATA);

  const reader = await dbgatePluginCsv.shellApi.reader({
    fileName: csvFileName,
  });

  const rows = await getReaderRows(reader);

  expect(rows[0].columns).toEqual([
    { columnName: 'Issue Number' },
    { columnName: 'Title' },
    { columnName: 'Github URL' },
    { columnName: 'Labels' },
    { columnName: 'State' },
    { columnName: 'Created At' },
    { columnName: 'Updated At' },
    { columnName: 'Reporter' },
    { columnName: 'Assignee' },
  ]);
  expect(rows.length).toEqual(9);
  expect(rows[1]).toEqual({
    'Issue Number': '801',
    Title: "Does it 'burst' the database on startup or first lUI load ? ",
    'Github URL': 'https://github.com/dbgate/dbgate/issues/801',
    Labels: '',
    State: 'open',
    'Created At': '05/23/2024',
    'Updated At': '05/23/2024',
    Reporter: 'rgarrigue',
    Assignee: '',
  });
});

test('JSON array import test', async () => {
  const jsonFileName = tmp.tmpNameSync();

  fs.writeFileSync(
    jsonFileName,
    JSON.stringify([
      { id: 1, val: 'v1' },
      { id: 2, val: 'v2' },
    ])
  );

  const reader = await dbgateApi.jsonReader({
    fileName: jsonFileName,
  });

  const rows = await getReaderRows(reader);

  expect(rows.length).toEqual(2);
  expect(rows).toEqual([
    { id: 1, val: 'v1' },
    { id: 2, val: 'v2' },
  ]);
});

test('JSON object import test', async () => {
  const jsonFileName = tmp.tmpNameSync();

  fs.writeFileSync(
    jsonFileName,
    JSON.stringify({
      k1: { id: 1, val: 'v1' },
      k2: { id: 2, val: 'v2' },
    })
  );

  const reader = await dbgateApi.jsonReader({
    fileName: jsonFileName,
    jsonStyle: 'object',
    keyField: 'mykey',
  });

  const rows = await getReaderRows(reader);

  expect(rows.length).toEqual(2);
  expect(rows).toEqual([
    { mykey: 'k1', id: 1, val: 'v1' },
    { mykey: 'k2', id: 2, val: 'v2' },
  ]);
});

test('JSON filtered object import test', async () => {
  const jsonFileName = tmp.tmpNameSync();

  fs.writeFileSync(
    jsonFileName,
    JSON.stringify({
      filtered: {
        k1: { id: 1, val: 'v1' },
        k2: { id: 2, val: 'v2' },
      },
    })
  );

  const reader = await dbgateApi.jsonReader({
    fileName: jsonFileName,
    jsonStyle: 'object',
    keyField: 'mykey',
    rootField: 'filtered',
  });

  const rows = await getReaderRows(reader);

  expect(rows.length).toEqual(2);
  expect(rows).toEqual([
    { mykey: 'k1', id: 1, val: 'v1' },
    { mykey: 'k2', id: 2, val: 'v2' },
  ]);
});
