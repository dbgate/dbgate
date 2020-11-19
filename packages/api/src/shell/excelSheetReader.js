const xlsx = require('xlsx');
const stream = require('stream');
const _ = require('lodash');

const loadedWorkbooks = {};

async function loadWorkbook(fileName) {
  let workbook = loadedWorkbooks[fileName];
  if (workbook) return workbook;
  console.log(`Loading excel ${fileName}`);
  workbook = xlsx.readFile(fileName);
  loadedWorkbooks[fileName] = workbook;
  return workbook;
}

async function excelSheetReader({ fileName, sheetName, limitRows = undefined }) {
  const workbook = await loadWorkbook(fileName);
  const sheet = workbook.Sheets[sheetName];

  const pass = new stream.PassThrough({
    objectMode: true,
  });
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  const header = rows[0];
  const structure = {
    columns: _.range(header.length).map((index) => ({ columnName: header[index] })),
  };
  pass.write(structure);
  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    if (limitRows && rowIndex > limitRows) break;
    const row = rows[rowIndex];
    const rowData = _.fromPairs(structure.columns.map((col, index) => [col.columnName, row[index]]));
    if (_.isEmpty(_.omitBy(rowData, (v) => v == null || v.toString().trim().length == 0))) continue;
    pass.write(rowData);
  }
  pass.end();

  return pass;
}

module.exports = excelSheetReader;
