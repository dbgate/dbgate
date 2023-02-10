const queryReader = require('./queryReader');
const runScript = require('./runScript');
const tableWriter = require('./tableWriter');
const tableReader = require('./tableReader');
const copyStream = require('./copyStream');
const fakeObjectReader = require('./fakeObjectReader');
const consoleObjectWriter = require('./consoleObjectWriter');
const jsonLinesWriter = require('./jsonLinesWriter');
const jsonArrayWriter = require('./jsonArrayWriter');
const jsonLinesReader = require('./jsonLinesReader');
const sqlDataWriter = require('./sqlDataWriter');
const jslDataReader = require('./jslDataReader');
const archiveWriter = require('./archiveWriter');
const archiveReader = require('./archiveReader');
const collectorWriter = require('./collectorWriter');
const finalizer = require('./finalizer');
const registerPlugins = require('./registerPlugins');
const requirePlugin = require('./requirePlugin');
const download = require('./download');
const executeQuery = require('./executeQuery');
const loadFile = require('./loadFile');
const deployDb = require('./deployDb');
const initializeApiEnvironment = require('./initializeApiEnvironment');
const dumpDatabase = require('./dumpDatabase');
const importDatabase = require('./importDatabase');
const loadDatabase = require('./loadDatabase');
const generateModelSql = require('./generateModelSql');
const modifyJsonLinesReader = require('./modifyJsonLinesReader');

const dbgateApi = {
  queryReader,
  runScript,
  tableWriter,
  tableReader,
  copyStream,
  jsonLinesWriter,
  jsonArrayWriter,
  jsonLinesReader,
  sqlDataWriter,
  fakeObjectReader,
  consoleObjectWriter,
  jslDataReader,
  archiveWriter,
  archiveReader,
  collectorWriter,
  finalizer,
  download,
  registerPlugins,
  executeQuery,
  loadFile,
  deployDb,
  initializeApiEnvironment,
  dumpDatabase,
  importDatabase,
  loadDatabase,
  generateModelSql,
  modifyJsonLinesReader,
};

requirePlugin.initializeDbgateApi(dbgateApi);

module.exports = dbgateApi;
