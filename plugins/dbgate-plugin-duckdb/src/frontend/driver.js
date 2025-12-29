// @ts-check

const { driverBase } = global.DBGATE_PACKAGES['dbgate-tools'];
const Dumper = require('./Dumper');
const { sqliteSplitterOptions, noSplitSplitterOptions } = require('dbgate-query-splitter/lib/options');
const duckDbIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"><path fill="#fff100" d="M249.9997 500C111.932 500 0 388.0684 0 250.0000 0 111.9318 111.3637 0 249.9997 0 388.6367 0 500 111.9318 500 250.0000c0 138.0684-111.9318 250-250.0003 250Z"/><path fill="#1d1d1b" d="M190.0545 146.5908c-56.8185 0-103.409 46.5908-103.409 103.4092 0 57.3869 46.5905 103.4092 103.409 103.4092 56.8184 0 103.4092-46.5909 103.4092-103.4092s-46.5908-103.4092-103.4092-103.4092Z"/><path fill="#1d1d1b" d="M376.1381 212.7836h-49.1468v74.4329h49.1468c20.554 0 37.2164-16.6623 37.2164-37.2164s-16.6624-37.2164-37.2164-37.2164Z"/></svg>';

/**
 * @param {string} databaseFile
 */
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
  defaultSchemaName: 'main',
  offsetFetchRangeSyntax: false,
  explicitDropConstraint: true,
  stringEscapeChar: "'",
  fallbackDataType: 'nvarchar',
  allowMultipleValuesInsert: true,
  dropColumnDependencies: ['indexes', 'primaryKey', 'uniques'],
  quoteIdentifier(s) {
    return `"${s}"`;
  },
  anonymousPrimaryKey: true,
  requireStandaloneSelectForScopeIdentity: true,

  createColumn: true,
  dropColumn: true,
  multipleSchema: true,
  createIndex: true,
  dropIndex: true,
  createForeignKey: false,
  enableForeignKeyChecks: false,
  // dropCheck: true,
  // dropUnique: true,
  // dropForeignKey: true,
  createPrimaryKey: false,
  // dropPrimaryKey: true,
  dropReferencesWhenDropTable: true,
  // dropIndexContainsTableSpec: true,
  // filteredIndexes: true,
  anonymousForeignKey: true,
};

/** @type {import('dbgate-types').EngineDriver} */
const driver = {
  ...driverBase,
  dumperClass: Dumper,
  dialect,
  engine: 'duckdb@dbgate-plugin-duckdb',
  title: 'DuckDB',
  readOnlySessions: false,
  supportsTransactions: true,
  singleConnectionOnly: true,
  icon: duckDbIcon,

  getQuerySplitterOptions: (usage) =>
    usage == 'editor'
      ? { ...sqliteSplitterOptions, ignoreComments: true, preventSingleLineSplit: true }
      : usage == 'stream'
      ? noSplitSplitterOptions
      : sqliteSplitterOptions,
  showConnectionTab: (field) => false,
  showConnectionField: (field) => ['databaseFile'].includes(field),
  beforeConnectionSave: (connection) => ({
    ...connection,
    singleDatabase: true,
    defaultDatabase: getDatabaseFileLabel(connection.databaseFile),
  }),
};

module.exports = driver;
