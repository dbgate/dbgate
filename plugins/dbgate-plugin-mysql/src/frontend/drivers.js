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

const mysqlDriverBase = {
  ...driverBase,
  showConnectionField: (field, values) =>
    ['server', 'port', 'user', 'password', 'defaultDatabase', 'singleDatabase'].includes(field),
  dumperClass: Dumper,
  dialect,
  defaultPort: 3306,
};

/** @type {import('dbgate-types').EngineDriver} */
const mysqlDriver = {
  ...mysqlDriverBase,
  engine: 'mysql@dbgate-plugin-mysql',
  title: 'MySQL',
};

/** @type {import('dbgate-types').EngineDriver} */
const mariaDriver = {
  ...mysqlDriverBase,
  engine: 'mariadb@dbgate-plugin-mysql',
  title: 'MariaDB',
};

module.exports = [mysqlDriver, mariaDriver];
