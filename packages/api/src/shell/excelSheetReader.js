const exceljs = require('exceljs');
const stream = require('stream');
const _ = require('lodash');

const loadedWorkbooks = {};

async function loadWorkbook(fileName) {
  let workbook = loadedWorkbooks[fileName];
  if (workbook) return workbook;
  console.log(`Loading excel ${fileName}`);
  workbook = new exceljs.Workbook();
  await workbook.xlsx.readFile(fileName);
  loadedWorkbooks[fileName] = workbook;
  return workbook;
}

async function excelSheetReader({ fileName, sheetName, limitRows = undefined }) {
  const workbook = await loadWorkbook(fileName);
  const sheet = workbook.getWorksheet(sheetName);

  const pass = new stream.PassThrough({
    objectMode: true,
  });
  const header = sheet.getRow(1);
  const structure = {
    columns: _.range(header.cellCount).map((index) => ({ columnName: header.getCell(index + 1).value })),
  };
  pass.write(structure);
  for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex++) {
    if (limitRows && rowIndex > limitRows + 1) break;
    const row = sheet.getRow(rowIndex);
    const rowData = _.fromPairs(structure.columns.map((col, index) => [col.columnName, row.getCell(index + 1).value]));
    if (_.isEmpty(_.omitBy(rowData, (v) => v == null || v.toString().trim().length == 0))) continue;
    pass.write(rowData);
  }
  pass.end();

  return pass;
}

module.exports = excelSheetReader;
