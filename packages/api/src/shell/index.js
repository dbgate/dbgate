const queryReader = require('./queryReader');
const runScript = require('./runScript');
const tableWriter = require('./tableWriter');
const tableReader = require('./tableReader');
const copyStream = require('./copyStream');
const fakeObjectReader = require('./fakeObjectReader');
const consoleObjectWriter = require('./consoleObjectWriter');
const jsonLinesWriter = require('./jsonLinesWriter');
const jsonLinesReader = require('./jsonLinesReader');
const jslDataReader = require('./jslDataReader');
const archiveWriter = require('./archiveWriter');
const archiveReader = require('./archiveReader');
const collectorWriter = require('./collectorWriter');
const finalizer = require('./finalizer');
const registerPlugins = require('./registerPlugins');
const requirePlugin = require('./requirePlugin');

const dbgateApi = {
  queryReader,
  runScript,
  tableWriter,
  tableReader,
  copyStream,
  jsonLinesWriter,
  jsonLinesReader,
  fakeObjectReader,
  consoleObjectWriter,
  jslDataReader,
  archiveWriter,
  archiveReader,
  collectorWriter,
  finalizer,
  registerPlugins,
};

requirePlugin.initialize(dbgateApi);

module.exports = dbgateApi;
