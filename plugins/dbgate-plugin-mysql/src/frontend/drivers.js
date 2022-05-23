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

  predefinedDataTypes: [
    'char(20)',
    'varchar(250)',
    'binary(250)',
    'varbinary(250)',
    'tinyblob',
    'tinytext',
    'text(1000)',
    'blob(1000)',
    'mediumtext',
    'mediumblob',
    'longtext',
    'longblob',
    'enum(val1,val2,val3)',
    'set(val1,val2,val3)',
    'bit(32)',
    'tinyint',
    'bool',
    'smallint',
    'mediumint',
    'int',
    'bigint',
    'float',
    'double',
    'decimal',
    'date',
    'datetime',
    'timestamp',
    'time',
    'year',
  ],
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
  supportsDatabaseDump: true,

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
