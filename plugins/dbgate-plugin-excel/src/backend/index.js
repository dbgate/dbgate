const xlsx = require('xlsx');
// when xlsx is bundled (release builds), webpack picks its ESM build, which has no filesystem access
// (readFile/writeFile fail with "cannot save file") unless fs is set explicitly
if (xlsx.set_fs) xlsx.set_fs(require('fs'));
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
