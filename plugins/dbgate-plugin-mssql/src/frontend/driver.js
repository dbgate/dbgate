const { driverBase } = require('dbgate-tools');
const MsSqlDumper = require('./MsSqlDumper');

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
  anonymousPrimaryKey: false,
  quoteIdentifier(s) {
    return `[${s}]`;
  },
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
  engine: 'mssql@dbgate-plugin-mssql',
  title: 'Microsoft SQL Server',
  defaultPort: 1433,
};

module.exports = driver;
