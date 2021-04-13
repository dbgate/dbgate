const { driverBase } = require('dbgate-tools');
const Dumper = require('./Dumper');

/** @type {import('dbgate-types').SqlDialect} */
const dialect = {
  rangeSelect: true,
  // stringEscapeChar: '\\',
  stringEscapeChar: "'",
  fallbackDataType: 'varchar',
  anonymousPrimaryKey: true,
  enableConstraintsPerTable: true,
  quoteIdentifier(s) {
    return '"' + s + '"';
  },
};

/** @type {import('dbgate-types').EngineDriver} */
const driver = {
  ...driverBase,
  dumperClass: Dumper,
  dialect,
  engine: 'postgres@dbgate-plugin-postgres',
  title: 'Postgre SQL',
  defaultPort: 5432,
};

module.exports = driver;
