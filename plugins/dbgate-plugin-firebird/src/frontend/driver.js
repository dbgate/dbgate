const { driverBase } = global.DBGATE_PACKAGES['dbgate-tools'];
const Dumper = require('./Dumper');
const { firebirdSplitterOptions } = require('dbgate-query-splitter/lib/options');

/** @type {import('dbgate-types').SqlDialect} */
const dialect = {
  rangeSelect: true,
  ilike: true,
  multipleSchema: false,
  stringEscapeChar: "'",
  fallbackDataType: 'varchar(256)',
  anonymousPrimaryKey: false,
  enableConstraintsPerTable: true,
  stringAgg: true,
  offsetFirstSkipSyntax: true,
  dropColumnDependencies: ['dependencies', 'primaryKeys', 'foreignKeys', 'indexes', 'uniques'],
  changeColumnDependencies: ['dependencies', 'primaryKeys', 'indexes', 'uniques'],
  renameColumnDependencies: ['dependencies', 'foreignKeys', 'uniques'],
  defaultValueBeforeNullability: true,
  useServerDatabaseFile: true,
  maxIdentifierLength: 31,

  quoteIdentifier(s) {
    return `"${s}"`;
  },

  dbFileExtension: '.fdb',

  implicitNullDeclaration: true,
  createColumn: true,
  dropColumn: true,
  changeColumn: true,
  createIndex: true,
  dropIndex: true,
  createForeignKey: true,
  dropForeignKey: true,
  createPrimaryKey: true,
  dropPrimaryKey: true,
  createUnique: true,
  dropUnique: true,
  createCheck: true,
  dropCheck: true,
  allowMultipleValuesInsert: false,
  renameSqlObject: true,
  filteredIndexes: true,
  disableRenameTable: true,
};

/** @type {import('dbgate-types').EngineDriver} */
const firebirdDriverBase = {
  ...driverBase,
  defaultPort: 3050,
  showConnectionField: field => ['port', 'user', 'password', 'server', 'databaseFile'].includes(field),

  getQuerySplitterOptions: (usage) =>
    usage == 'editor'
      ? { ...firebirdSplitterOptions, ignoreComments: true, preventSingleLineSplit: true }
      : firebirdSplitterOptions,

  beforeConnectionSave: connection => {
    const { databaseFile } = connection;
    return {
      ...connection,
      singleDatabase: true,
      defaultDatabase: databaseFile,
    };
  },

  adaptDataType(dataType) {
    if (dataType?.toLowerCase() == 'datetime') return 'TIMESTAMP';
    if (dataType?.toLowerCase() == 'text') return 'BLOB SUB_TYPE 1 CHARACTER SET UTF8';
    return dataType;
  },

  engine: 'firebird@dbgate-plugin-firebird',
  title: 'Firebird',
  supportsTransactions: true,
  dumperClass: Dumper,
  dialect,
};

module.exports = firebirdDriverBase;
