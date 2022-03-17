const { driverBase } = global.DBGATE_TOOLS;
const { mysqlSplitterOptions } = require('dbgate-query-splitter/lib/options');
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

  createColumn: true,
  dropColumn: true,
  changeColumn: true,
  createIndex: true,
  dropIndex: true,
  createForeignKey: true,
  dropForeignKey: true,
  createPrimaryKey: true,
  dropPrimaryKey: true,
  dropIndexContainsTableSpec: true,
  createUnique: true,
  dropUnique: true,
  createCheck: true,
  dropCheck: true,

  dropReferencesWhenDropTable: false,

  columnProperties: {
    columnComment: true,
    isUnsigned: true,
    isZerofill: true,
  },
};

const mysqlDriverBase = {
  ...driverBase,
  showConnectionField: (field, values) =>
    ['server', 'port', 'user', 'password', 'defaultDatabase', 'singleDatabase', 'isReadOnly'].includes(field),
  dumperClass: Dumper,
  dialect,
  defaultPort: 3306,
  getQuerySplitterOptions: () => mysqlSplitterOptions,
  readOnlySessions: true,

  getNewObjectTemplates() {
    return [
      { label: 'New view', sql: 'CREATE VIEW myview\nAS\nSELECT * FROM table1' },
      {
        label: 'New procedure',
        sql:
          'DELIMITER //\n\nCREATE PROCEDURE myproc (IN arg1 INT)\nBEGIN\n  SELECT * FROM table1;\nEND\n\nDELIMITER ;',
      },
      { label: 'New function', sql: 'CREATE FUNCTION myfunc (arg1 INT)\nRETURNS INT DETERMINISTIC\nRETURN 1' },
    ];
  },
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
