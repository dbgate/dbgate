const { driverBase } = require('dbgate-tools');
const Dumper = require('./Dumper');

function getDatabaseFileLabel(databaseFile) {
  if (!databaseFile) return databaseFile;
  const m = databaseFile.match(/[\/]([^\/]+)$/);
  if (m) return m[1];
  return databaseFile;
}

/** @type {import('dbgate-types').SqlDialect} */
const dialect = {
  limitSelect: true,
  rangeSelect: true,
  offsetFetchRangeSyntax: false,
  stringEscapeChar: "'",
  fallbackDataType: 'nvarchar(max)',
  quoteIdentifier(s) {
    return `[${s}]`;
  },
};

/** @type {import('dbgate-types').EngineDriver} */
const driver = {
  ...driverBase,
  dumperClass: Dumper,
  dialect,
  engine: 'sqlite@dbgate-plugin-sqlite',
  title: 'SQLite',
  showConnectionField: (field, values) => field == 'databaseFile',
  showConnectionTab: (field) => false,
  beforeConnectionSave: (connection) => ({
    ...connection,
    singleDatabase: true,
    defaultDatabase: getDatabaseFileLabel(connection.databaseFile),
  }),
  // isFileDatabase: true,
  isElectronOnly: true,
};

module.exports = driver;
