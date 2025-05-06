const { driverBase } = global.DBGATE_PACKAGES['dbgate-tools'];
const Dumper = require('./Dumper');

/** @type {import('dbgate-types').SqlDialect} */
const dialect = {
  rangeSelect: true,
  ilike: true,
  defaultSchemaName: 'public',
  multipleSchema: true,
  stringEscapeChar: "'",
  fallbackDataType: 'varchar',
  anonymousPrimaryKey: false,
  enableConstraintsPerTable: true,
  stringAgg: true,

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
  allowMultipleValuesInsert: true,
  renameSqlObject: true,
  filteredIndexes: true,
};

const firebirdSplitterOptions = {
  stringsBegins: ["'", '"'],
  stringsEnds: {
    "'": "'",
    '"': '"',
  },
  stringEscapes: {
    "'": "'", // Single quote is escaped by another single quote
    '"': '"', // Double quote is escaped by another double quote
  },
  allowSemicolon: true,
  allowCustomDelimiter: false,
  allowCustomSqlTerminator: false,
  allowGoDelimiter: false,
  allowSlashDelimiter: false,
  allowDollarDollarString: false,
  noSplit: false,
  doubleDashComments: true,
  multilineComments: true,
  javaScriptComments: false,
  skipSeparatorBeginEnd: false,
  ignoreComments: false,
  preventSingleLineSplit: false,
  adaptiveGoSplit: false,
  returnRichInfo: false,
  splitByLines: false,
  splitByEmptyLine: false,
  copyFromStdin: false,
  queryParameterStyle: ':', // Firebird uses colon-prefixed parameters (:param_name)
};

/** @type {import('dbgate-types').EngineDriver} */
const firebirdDriverBase = {
  ...driverBase,
  defaultPort: 3050,
  showConnectionField: field => ['port', 'user', 'password', 'server', 'databaseFile'].includes(field),
  getQuerySplitterOptions: () => firebirdSplitterOptions,
  // beforeConnectionSave: connection => {
  //   const { databaseFile } = connection;
  //   return {
  //     singleDatabase: true,
  //     defaultDatabase: databaseFile,
  //   };
  // },
  engine: 'firebird@dbgate-plugin-firebird',
  title: 'Firebird',
  supportsTransactions: true,
  dumperClass: Dumper,
  dialect,
};

module.exports = firebirdDriverBase;
