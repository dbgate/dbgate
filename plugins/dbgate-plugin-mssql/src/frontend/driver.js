const { driverBase } = global.DBGATE_TOOLS;
const MsSqlDumper = require('./MsSqlDumper');
const { mssqlSplitterOptions } = require('dbgate-query-splitter/lib/options');

/** @type {import('dbgate-types').SqlDialect} */
const dialect = {
  limitSelect: true,
  rangeSelect: true,
  offsetFetchRangeSyntax: true,
  rowNumberOverPaging: true,
  stringEscapeChar: "'",
  fallbackDataType: 'nvarchar(max)',
  explicitDropConstraint: false,
  enableConstraintsPerTable: true,
  dropColumnDependencies: ['default', 'dependencies', 'indexes', 'primaryKey', 'foreignKeys', 'uniques'],
  changeColumnDependencies: ['indexes', 'dependencies', 'uniques'],
  anonymousPrimaryKey: false,
  dropIndexContainsTableSpec: true,
  quoteIdentifier(s) {
    return `[${s}]`;
  },

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
};

/** @type {import('dbgate-types').EngineDriver} */
const driver = {
  ...driverBase,
  dumperClass: MsSqlDumper,
  dialect,
  dialectByVersion(version) {
    if (version && version.productVersionNumber < 11) {
      return {
        ...dialect,
        rangeSelect: false,
        offsetFetchRangeSyntax: false,
      };
    }
    return dialect;
  },
  showConnectionField: (field, values) =>
    ['authType', 'server', 'port', 'user', 'password', 'defaultDatabase', 'singleDatabase'].includes(field),
  getQuerySplitterOptions: () => mssqlSplitterOptions,

  engine: 'mssql@dbgate-plugin-mssql',
  title: 'Microsoft SQL Server',
  defaultPort: 1433,
};

module.exports = driver;
