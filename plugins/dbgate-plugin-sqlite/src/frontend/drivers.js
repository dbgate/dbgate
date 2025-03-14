// @ts-check

const { driverBase } = global.DBGATE_PACKAGES['dbgate-tools'];
const Dumper = require('./Dumper');
const { sqliteSplitterOptions, noSplitSplitterOptions } = require('dbgate-query-splitter/lib/options');

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
  explicitDropConstraint: true,
  stringEscapeChar: "'",
  fallbackDataType: 'nvarchar',
  allowMultipleValuesInsert: true,
  dropColumnDependencies: ['indexes', 'primaryKey', 'uniques'],
  quoteIdentifier(s) {
    return `[${s}]`;
  },
  anonymousPrimaryKey: true,
  requireStandaloneSelectForScopeIdentity: true,

  createColumn: true,
  dropColumn: true,
  createIndex: true,
  dropIndex: true,
  createForeignKey: false,
  enableForeignKeyChecks: false,
  dropForeignKey: false,
  createPrimaryKey: false,
  dropPrimaryKey: false,
  dropReferencesWhenDropTable: false,
  filteredIndexes: true,
  anonymousForeignKey: true,
};

/** @type {import('dbgate-types').EngineDriver} */
const sqliteDriverBase = {
  ...driverBase,
  dumperClass: Dumper,
  dialect,
  readOnlySessions: true,
  supportsTransactions: true,

  getQuerySplitterOptions: (usage) =>
    usage == 'editor'
      ? { ...sqliteSplitterOptions, ignoreComments: true, preventSingleLineSplit: true }
      : usage == 'stream'
      ? noSplitSplitterOptions
      : sqliteSplitterOptions,
  showConnectionTab: (field) => false,

  predefinedDataTypes: ['integer', 'real', 'text', 'blob'],
};

/** @type {import('dbgate-types').EngineDriver} */
const driver = {
  ...sqliteDriverBase,
  engine: 'sqlite@dbgate-plugin-sqlite',
  title: 'SQLite',
  showConnectionField: (field, values) => field == 'databaseFile' || field == 'isReadOnly',
  beforeConnectionSave: (connection) => ({
    ...connection,
    singleDatabase: true,
    defaultDatabase: getDatabaseFileLabel(connection.databaseFile),
  }),

  // isFileDatabase: true,
  // isElectronOnly: true,
};

/** @type {import('dbgate-types').EngineDriver} */
const libsqlDriver = {
  ...sqliteDriverBase,
  engine: 'libsql@dbgate-plugin-sqlite',
  title: 'LibSQL',
  authTypeLabel: 'Target type',
  authTypeFirst: true,
  premiumOnly: true,

  showConnectionField: (field, values) => {
    if ((values?.authType ?? 'url') === 'url') {
      return ['databaseUrl', 'authToken', 'isReadOnly', 'authType'].includes(field);
    }
    if (['databaseFile', 'isReadOnly'].includes(field)) return true;
    if (field == 'authType') return true;
    return false;
  },

  defaultAuthTypeName: 'url',
  beforeConnectionSave: (connection) => ({
    ...connection,
    singleDatabase: true,
    defaultDatabase: getDatabaseFileLabel(connection.databaseFile || connection.databaseUrl),
  }),

  // isFileDatabase: true,
  // isElectronOnly: true,
};

module.exports = [driver, libsqlDriver];
