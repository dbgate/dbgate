const xlsx = require('xlsx');
const _ = require('lodash');

module.exports = {
  openedReaders: {},

  analyseExcel_meta: 'get',
  async analyseExcel({ filePath }) {
    const workbook = xlsx.readFile(filePath, { bookSheets: true });
    return workbook.SheetNames;
  },
};
