const { driverBase } = require('dbgate-tools');
const Dumper = require('./Dumper');

/** @type {import('dbgate-types').SqlDialect} */
const dialect = {
  rangeSelect: true,
  stringEscapeChar: '\\',
  fallbackDataType: 'longtext',
  enableConstraintsPerTable: false,
  anonymousPrimaryKey: true,
  explicitDropConstraint: true,
  quoteIdentifier(s) {
    return '`' + s + '`';
  },
};

/** @type {import('dbgate-types').EngineDriver} */
const mysqlDriver = {
  ...driverBase,
  dumperClass: Dumper,
  dialect,
  engine: 'mysql@dbgate-plugin-mysql',
  title: 'MySQL',
  defaultPort: 3306,
};

/** @type {import('dbgate-types').EngineDriver} */
const mariaDriver = {
  ...driverBase,
  dumperClass: Dumper,
  dialect,
  engine: 'mariadb@dbgate-plugin-mysql',
  title: 'MariaDB',
  defaultPort: 3306,
};

module.exports = [mysqlDriver, mariaDriver];
