const { driverBase } = global.DBGATE_PACKAGES['dbgate-tools'];
const { mysqlSplitterOptions } = require('dbgate-query-splitter/lib/options');
const Dumper = require('./Dumper');

const spatialTypes = [
  'POINT',
  'LINESTRING',
  'POLYGON',
  'GEOMETRY',
  'MULTIPOINT',
  'MULTILINESTRING',
  'MULTIPOLYGON',
  'GEOMCOLLECTION',
  'GEOMETRYCOLLECTION',
];

/** @type {import('dbgate-types').SqlDialect} */
const dialect = {
  rangeSelect: true,
  stringEscapeChar: '\\',
  fallbackDataType: 'longtext',
  enableConstraintsPerTable: false,
  anonymousPrimaryKey: true,
  explicitDropConstraint: true,
  allowMultipleValuesInsert: true,
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
  requireStandaloneSelectForScopeIdentity: true,

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
    "enum('val1','val2','val3')",
    "set('val1','val2','val3')",
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

  createColumnViewExpression(columnName, dataType, source, alias) {
    if (dataType && spatialTypes.includes(dataType.toUpperCase())) {
      return {
        exprType: 'call',
        func: 'ST_AsText',
        alias: alias || columnName,
        args: [
          {
            exprType: 'column',
            columnName,
            source,
          },
        ],
      };
    }
  },

  getSupportedEngines() {
    return [];
  },

  // getTableFormOptions(intent) {
  //   return [
  //     {
  //       type: 'dropdowntext',
  //       options: this.getSupportedEngines(),
  //       label: 'Engine',
  //       name: 'tableEngine',
  //       sqlFormatString: '^engine = %s',
  //     },
  //     {
  //       type: 'text',
  //       label: 'Comment',
  //       name: 'objectComment',
  //       sqlFormatString: '^comment = %v',
  //     },
  //   ];
  // },
};

const mysqlDialect = {
  ...dialect,
  getSupportedEngines() {
    const mysqlEngines = [
      'InnoDB', // Default and most commonly used engine with ACID transaction support and referential integrity.
      'MyISAM', // Older engine without transaction or referential integrity support.
      'MEMORY', // Tables stored in memory, very fast but volatile, used for temporary data.
      'CSV', // Tables stored in CSV format, useful for import/export of data.
      'ARCHIVE', // Engine for storing large amounts of historical data with compression.
      'BLACKHOLE', // Engine that discards data, useful for replication.
      'FEDERATED', // Access tables on remote MySQL servers.
      'MRG_MYISAM', // Merges multiple MyISAM tables into one.
      'NDB', // Cluster storage engine for MySQL Cluster.
      'EXAMPLE', // Example engine for developers, has no real functionality.
      'PERFORMANCE_SCHEMA', // Engine used for performance monitoring in MySQL.
      'SEQUENCE', // Special engine for sequences, used in MariaDB.
      'SPIDER', // Engine for horizontal partitioning, often used in MariaDB.
      'ROCKSDB', // Engine optimized for read-heavy workloads, commonly used in Facebook MySQL.
      'TokuDB', // Engine with high data compression and SSD optimization.
    ];
    return mysqlEngines;
  },
};

const mysqlDriverBase = {
  ...driverBase,
  showConnectionField: (field, values) =>
    ['authType', 'user', 'password', 'defaultDatabase', 'singleDatabase', 'isReadOnly'].includes(field) ||
    (values.authType == 'socket' && ['socketPath'].includes(field)) ||
    (values.authType != 'socket' && ['server', 'port'].includes(field)),
  dumperClass: Dumper,
  defaultPort: 3306,
  getQuerySplitterOptions: usage =>
    usage == 'editor'
      ? { ...mysqlSplitterOptions, ignoreComments: true, preventSingleLineSplit: true }
      : mysqlSplitterOptions,

  readOnlySessions: true,
  supportsDatabaseDump: true,
  authTypeLabel: 'Connection mode',
  defaultAuthTypeName: 'hostPort',
  defaultSocketPath: '/var/run/mysqld/mysqld.sock',
  supportsTransactions: true,

  getNewObjectTemplates() {
    return [
      { label: 'New view', sql: 'CREATE VIEW myview\nAS\nSELECT * FROM table1' },
      {
        label: 'New procedure',
        sql: 'DELIMITER //\n\nCREATE PROCEDURE myproc (IN arg1 INT)\nBEGIN\n  SELECT * FROM table1;\nEND\n\nDELIMITER ;',
      },
      { label: 'New function', sql: 'CREATE FUNCTION myfunc (arg1 INT)\nRETURNS INT DETERMINISTIC\nRETURN 1' },
    ];
  },
};

/** @type {import('dbgate-types').EngineDriver} */
const mysqlDriver = {
  ...mysqlDriverBase,
  dialect: mysqlDialect,
  engine: 'mysql@dbgate-plugin-mysql',
  title: 'MySQL',
  __analyserInternals: {
    quoteDefaultValues: true,
  },
};

const mariaDbDialect = {
  ...dialect,
  getSupportedEngines() {
    const mariaDBEngines = [
      'InnoDB', // Main transactional engine, similar to MySQL, supports ACID transactions and referential integrity.
      'Aria', // Replacement for MyISAM, supports crash recovery and optimized for high speed.
      'MyISAM', // Older engine without transaction support, still supported for compatibility.
      'MEMORY', // Tables stored in memory, suitable for temporary data.
      'CSV', // Stores data in CSV format, easy for export/import.
      'ARCHIVE', // Stores compressed data, suitable for historical records.
      'BLACKHOLE', // Engine that does not store data, often used for replication.
      'FEDERATED', // Allows access to tables on remote MariaDB/MySQL servers.
      'MRG_MyISAM', // Allows merging multiple MyISAM tables into one.
      'SEQUENCE', // Special engine for generating sequences.
      'SphinxSE', // Engine for full-text search using Sphinx.
      'SPIDER', // Engine for sharding, supports horizontal partitioning.
      'TokuDB', // High-compression engine optimized for large data sets and SSDs.
      'RocksDB', // Read-optimized engine focused on performance with large data.
      'CONNECT', // Engine for accessing external data sources (e.g., files, web services).
      'OQGRAPH', // Graph engine, suitable for hierarchical and graph structures.
      'ColumnStore', // Analytical engine for columnar data storage, suitable for Big Data.
      'Mroonga', // Engine supporting full-text search in Japanese and other languages.
      'S3', // Allows storing data in Amazon S3-compatible storage.
      'XtraDB', // Enhanced InnoDB engine with optimizations from Percona (commonly used in older MariaDB versions).
    ];
    return mariaDBEngines;
  },
};

/** @type {import('dbgate-types').EngineDriver} */
const mariaDriver = {
  ...mysqlDriverBase,
  dialect: mariaDbDialect,
  engine: 'mariadb@dbgate-plugin-mysql',
  title: 'MariaDB',
  __analyserInternals: {
    quoteDefaultValues: false,
  },
};

module.exports = [mysqlDriver, mariaDriver];
