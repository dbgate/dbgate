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
const postgresDriver = {
  ...driverBase,
  dumperClass: Dumper,
  dialect,
  engine: 'postgres@dbgate-plugin-postgres',
  title: 'Postgre SQL',
  defaultPort: 5432,
};

/** @type {import('dbgate-types').EngineDriver} */
const cockroachDriver = {
  ...driverBase,
  dumperClass: Dumper,
  dialect,
  engine: 'cockroach@dbgate-plugin-postgres',
  title: 'CockroachDB',
  defaultPort: 26257,
};

/** @type {import('dbgate-types').EngineDriver} */
const redshiftDriver = {
  ...driverBase,
  dumperClass: Dumper,
  dialect,
  engine: 'red@dbgate-plugin-postgres',
  title: 'Amazon Redshift',
  defaultPort: 5432,
};

module.exports = [postgresDriver, cockroachDriver, redshiftDriver];
