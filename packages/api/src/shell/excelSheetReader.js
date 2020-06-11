const exceljs = require('exceljs');
const stream = require('stream');
const _ = require('lodash');

async function excelSheetReader({ fileName, sheetName }) {
  console.log(`Loading excel ${fileName}`);
  const workbook = new exceljs.Workbook();
  await workbook.xlsx.readFile(fileName);
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
    const row = sheet.getRow(rowIndex);
    pass.write(_.fromPairs(structure.columns.map((col, index) => [col.columnName, row.getCell(index + 1).value])));
  }
  pass.end();

  return pass;
}

module.exports = excelSheetReader;
