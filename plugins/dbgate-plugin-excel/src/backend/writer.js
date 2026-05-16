const xlsx = require('xlsx');
const stream = require('stream');

const MAX_SHEET_NAME_LENGTH = 31;
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
    const existingLower = new Set(workbook.SheetNames.map((n) => n.toLowerCase()));
    const base = (this.sheetName || 'Sheet 1').substring(0, MAX_SHEET_NAME_LENGTH);
    let sheetName = base;
    if (existingLower.has(sheetName.toLowerCase())) {
      let counter = 1;
      do {
        const suffix = `_${counter}`;
        sheetName = base.substring(0, MAX_SHEET_NAME_LENGTH - suffix.length) + suffix;
        counter++;
      } while (existingLower.has(sheetName.toLowerCase()));
    }
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(this.rows), sheetName);
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
