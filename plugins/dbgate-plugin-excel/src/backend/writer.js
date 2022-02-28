const xlsx = require('xlsx');
const stream = require('stream');

const writingWorkbooks = {};

async function saveExcelFiles() {
  for (const file in writingWorkbooks) {
    xlsx.writeFile(writingWorkbooks[file], file);
  }
}

function createWorkbook(fileName) {
  let workbook = writingWorkbooks[fileName];
  if (workbook) return workbook;
  workbook = xlsx.utils.book_new();
  writingWorkbooks[fileName] = workbook;
  return workbook;
}

class ExcelSheetWriterStream extends stream.Writable {
  constructor({ fileName, sheetName }) {
    super({ objectMode: true });
    this.rows = [];
    this.structure = null;
    this.fileName = fileName;
    this.sheetName = sheetName;
    this.requireFixedStructure = true;
  }
  _write(chunk, enc, next) {
    if (this.structure) {
      this.rows.push(this.structure.columns.map((col) => chunk[col.columnName]));
    } else {
      this.structure = chunk;
      this.rows.push(chunk.columns.map((x) => x.columnName));
    }

    next();
  }

  _final(callback) {
    const workbook = createWorkbook(this.fileName);
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(this.rows), this.sheetName || 'Sheet 1');
    callback();
  }
}

async function writer({ fileName, sheetName }) {
  return new ExcelSheetWriterStream({
    fileName,
    sheetName,
  });
}

writer.initialize = ({ dbgateApi }) => {
  dbgateApi.finalizer.register(saveExcelFiles);
};

module.exports = writer;
