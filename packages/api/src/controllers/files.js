const exceljs = require('exceljs');
const _ = require('lodash');

module.exports = {
  openedReaders: {},

  analyseExcel_meta: 'get',
  async analyseExcel({ filePath }) {
    const workbook = new exceljs.Workbook();
    await workbook.xlsx.readFile(filePath);
    return {
      tables: workbook.worksheets.map((sheet) => {
        const header = sheet.getRow(1);
        const columns = _.range(header.cellCount).map((index) => ({ columnName: header.getCell(index + 1).value }));
        return { pureName: sheet.name, columns };
      }),
    };
  },
};
