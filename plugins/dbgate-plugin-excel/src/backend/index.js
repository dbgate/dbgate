const xlsx = require('xlsx');
const reader = require('./reader');
const writer = require('./writer');

let dbgateApi;

module.exports = {
  packageName: 'dbgate-plugin-excel',
  shellApi: {
    reader,
    writer,
  },

  commands: {
    analyse: async ({ fileName }) => {
      const downloadedFile = await dbgateApi.download(fileName);
      const workbook = xlsx.readFile(downloadedFile, { bookSheets: true });
      return workbook.SheetNames;
    },
  },
  initialize(dbgateEnv) {
    dbgateApi = dbgateEnv.dbgateApi;
    writer.initialize(dbgateEnv);
    reader.initialize(dbgateEnv);
  },
};
