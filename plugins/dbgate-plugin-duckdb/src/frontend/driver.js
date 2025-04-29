// @ts-check

const { driverBase } = global.DBGATE_PACKAGES['dbgate-tools'];
const Dumper = require('./Dumper');
const { sqliteSplitterOptions, noSplitSplitterOptions } = require('dbgate-query-splitter/lib/options');

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
