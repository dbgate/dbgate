const xlsx = require('xlsx');
const stream = require('stream');
const _ = require('lodash');

const loadedWorkbooks = {};
let dbgateApi;

async function loadWorkbook(fileName) {
  let workbook = loadedWorkbooks[fileName];
  if (workbook) return workbook;
  console.log(`Loading excel ${fileName}`);
  const downloadedFile = await dbgateApi.download(fileName);
  workbook = xlsx.readFile(downloadedFile);
  loadedWorkbooks[fileName] = workbook;
  return workbook;
}

async function waitForDrain(stream) {
  return new Promise((resolve) => {
    stream.once('drain', () => {
      resolve();
    });
  });
}

async function reader({ fileName, sheetName, limitRows = undefined }) {
  const pass = new stream.PassThrough({
    objectMode: true,
    highWaterMark: 100,
  });

  const workbook = await loadWorkbook(fileName);
  const sheet = workbook.Sheets[sheetName];

  const rows = xlsx.utils.sheet_to_json(sheet, {
    header: 1,
    blankrows: false,
  });
  const header = rows[0];
  const structure = {
    __isStreamHeader: true,
    columns: _.range(header.length).map((index) => ({ columnName: header[index] })),
  };
  if (!pass.write(structure)) await waitForDrain(pass);

  const sendAsync = async () => {
    for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
      if (limitRows && rowIndex > limitRows) break;
      const row = rows[rowIndex];
      const rowData = _.fromPairs(structure.columns.map((col, index) => [col.columnName, row[index]]));
      if (_.isEmpty(_.omitBy(rowData, (v) => v == null || v.toString().trim().length == 0))) continue;
      if (!pass.write(rowData)) await waitForDrain(pass);
    }
    pass.end();
  };

  // don't wait for sending
  sendAsync();

  return pass;
}

reader.initialize = (dbgateEnv) => {
  dbgateApi = dbgateEnv.dbgateApi;
};

module.exports = reader;
