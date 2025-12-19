const { driverBase } = global.DBGATE_PACKAGES['dbgate-tools'];
const { mysqlSplitterOptions } = require('dbgate-query-splitter/lib/options');
const Dumper = require('./Dumper');
const mySqlIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path fill="#00618A" d="M116.948 97.807c-6.863-.187-12.104.452-16.585 2.341-1.273.537-3.305.552-3.513 2.147.7.733.809 1.829 1.365 2.731 1.07 1.73 2.876 4.052 4.488 5.268 1.762 1.33 3.577 2.751 5.465 3.902 3.358 2.047 7.107 3.217 10.34 5.268 1.906 1.21 3.799 2.733 5.658 4.097.92.675 1.537 1.724 2.732 2.147v-.194c-.628-.8-.79-1.898-1.366-2.733l-2.537-2.537c-2.48-3.292-5.629-6.184-8.976-8.585-2.669-1.916-8.642-4.504-9.755-7.609l-.195-.195c1.892-.214 4.107-.898 5.854-1.367 2.934-.786 5.556-.583 8.585-1.365l4.097-1.171v-.78c-1.531-1.571-2.623-3.651-4.292-5.073-4.37-3.72-9.138-7.437-14.048-10.537-2.724-1.718-6.089-2.835-8.976-4.292-.971-.491-2.677-.746-3.318-1.562-1.517-1.932-2.342-4.382-3.511-6.633-2.449-4.717-4.854-9.868-7.024-14.831-1.48-3.384-2.447-6.72-4.293-9.756-8.86-14.567-18.396-23.358-33.169-32-3.144-1.838-6.929-2.563-10.929-3.513-2.145-.129-4.292-.26-6.438-.391-1.311-.546-2.673-2.149-3.902-2.927C17.811 4.565 5.257-2.16 1.633 6.682c-2.289 5.581 3.421 11.025 5.462 13.854 1.434 1.982 3.269 4.207 4.293 6.438.674 1.467.79 2.938 1.367 4.489 1.417 3.822 2.652 7.98 4.487 11.511.927 1.788 1.949 3.67 3.122 5.268.718.981 1.951 1.413 2.145 2.927-1.204 1.686-1.273 4.304-1.95 6.44-3.05 9.615-1.899 21.567 2.537 28.683 1.36 2.186 4.567 6.871 8.975 5.073 3.856-1.57 2.995-6.438 4.098-10.732.249-.973.096-1.689.585-2.341v.195l3.513 7.024c2.6 4.187 7.212 8.562 11.122 11.514 2.027 1.531 3.623 4.177 6.244 5.073v-.196h-.195c-.508-.791-1.303-1.119-1.951-1.755-1.527-1.497-3.225-3.358-4.487-5.073-3.556-4.827-6.698-10.11-9.561-15.609-1.368-2.627-2.557-5.523-3.709-8.196-.444-1.03-.438-2.589-1.364-3.122-1.263 1.958-3.122 3.542-4.098 5.854-1.561 3.696-1.762 8.204-2.341 12.878-.342.122-.19.038-.391.194-2.718-.655-3.672-3.452-4.683-5.853-2.554-6.07-3.029-15.842-.781-22.829.582-1.809 3.21-7.501 2.146-9.172-.508-1.666-2.184-2.63-3.121-3.903-1.161-1.574-2.319-3.646-3.124-5.464-2.09-4.731-3.066-10.044-5.267-14.828-1.053-2.287-2.832-4.602-4.293-6.634-1.617-2.253-3.429-3.912-4.683-6.635-.446-.968-1.051-2.518-.391-3.513.21-.671.508-.951 1.171-1.17 1.132-.873 4.284.29 5.462.779 3.129 1.3 5.741 2.538 8.392 4.294 1.271.844 2.559 2.475 4.097 2.927h1.756c2.747.631 5.824.195 8.391.975 4.536 1.378 8.601 3.523 12.292 5.854 11.246 7.102 20.442 17.21 26.732 29.269 1.012 1.942 1.45 3.794 2.341 5.854 1.798 4.153 4.063 8.426 5.852 12.488 1.786 4.052 3.526 8.141 6.05 11.513 1.327 1.772 6.451 2.723 8.781 3.708 1.632.689 4.307 1.409 5.854 2.34 2.953 1.782 5.815 3.903 8.586 5.855 1.383.975 5.64 3.116 5.852 4.879zM29.729 23.466c-1.431-.027-2.443.156-3.513.389v.195h.195c.683 1.402 1.888 2.306 2.731 3.513.65 1.367 1.301 2.732 1.952 4.097l.194-.193c1.209-.853 1.762-2.214 1.755-4.294-.484-.509-.555-1.147-.975-1.755-.556-.811-1.635-1.272-2.339-1.952z"/></svg>';
const mariaDbIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512.01 340.29" xml:space="preserve"><style>.st0{fill-rule:evenodd;clip-rule:evenodd;fill:#002b64}.st3{fill:#002b64}</style><g transform="translate(0,-85.79)"><path d="M500.7 86.5c-7.9.3-5.4 2.5-22.5 6.7-17.3 4.2-38.4 2.9-57 10.7-55.5 23.3-66.6 102.8-117.1 131.3-37.6 21.3-75.8 23-109.9 33.6-22.5 7.1-47 21.5-67.5 39-15.8 13.6-16.2 25.6-32.8 42.7C76.3 368.9 23.6 351 0 379c7.7 7.7 11.1 9.9 26.2 7.9-3.1 5.9-21.6 10.9-18 19.7 3.8 9.2 48.4 15.4 88.9-9.1 18.9-11.4 33.9-27.9 63.2-31.9 38.2-5.1 82 3.2 125.9 9.6-6.6 19.5-19.7 32.5-30.2 47.8-3.2 3.5 6.6 3.9 17.7 1.8 20.1-5 34.5-9 49.8-17.8 18.6-10.9 21.4-38.7 44.4-44.7 12.7 19.6 47.3 24.2 68.9 8.5-18.9-5.4-24.1-45.6-17.7-63.2 6-16.7 12-43.6 18.1-65.8 6.5-23.8 8.9-53.8 16.8-65.8 11.9-18.2 25-24.5 36.5-34.7C501.9 131 512.3 121 512 97.4c-.1-7.6-4-11.8-11.2-11.6z" class="st0"/><path d="M16.5 405.5c28.8 4.1 46.4 0 69.8-10.1 19.7-8.6 38.7-26.2 62.1-33.6 34.2-11 71.8 0 108.5 2.2 8.9.5 17.8.5 26.5-.4 13.6-8.4 13.4-39.6 26.6-42.7-.4 43.9-18.4 70.3-37.3 95.7 39.9-7 63.5-29.9 79.5-60.7 4.9-9.3 9-19.3 12.7-29.9 5.7 4.4 2.5 17.7 5.3 24.8 27.4-15.2 43-50.1 53.5-85.2 12-40.7 16.9-82 24.7-94 7.5-11.8 19.3-19 30.2-26.5 12.2-8.6 23.1-17.5 24.9-33.9-12.9-1.2-15.8-4.2-17.7-10.7-6.4 3.6-12.4 4.4-19.1 4.6-5.8.2-12.2-.1-20 .7-64.4 6.6-72.6 77.8-113.9 117.9-3 2.9-6.3 5.7-9.7 8.2-14.5 10.8-32.2 18.5-48.4 24.7-26.4 10.1-51.5 10.8-76.3 19.5-18.2 6.4-36.7 15.7-51.5 25.9-3.7 2.6-7.3 5.2-10.5 7.8-8.8 7.2-14.5 15.1-20.1 23.3-5.8 8.4-11.3 17.1-19.7 25.4-13.7 13.4-64.9 3.9-82.9 16.4-2 1.4-3.6 3-4.7 5 9.8 4.5 16.4 1.7 27.7 3 1.5 10.7-23.3 17.1-19.7 22z" fill="#c49a6c"/><path d="M406.7 325.8c.8 12.3 7.9 36.7 14.2 42.7-12.4 3-33.6-2-39-10.7 2.8-12.6 17.4-24.1 24.9-31.9z" fill="#c49a6c" fill-rule="evenodd" clip-rule="evenodd"/><path d="M423.8 132.1c9.1 7.9 28.3 1.6 24.8-14.2-14.1-1.2-22.3 3.7-24.8 14.2" class="st0"/><path d="M486.5 112.2c-2.4 5.1-7.1 11.6-7.1 24.6 0 2.2-1.7 3.8-1.7.3.1-12.7 3.5-18.1 7-25.3 1.7-3 2.7-1.8 1.8.4" class="st3"/><path d="M486.5 112.2c-2.8 4.8-9.7 13.7-10.9 26.6-.2 2.2-2 3.6-1.7.2 1.2-12.6 6.7-20.5 10.9-27.3 1.9-2.9 2.8-1.6 1.7.5m-2.9-2.9c-3.2 4.6-13.9 15.2-16.1 28-.4 2.2-2.3 3.4-1.7 0 2.3-12.4 11.4-22.2 16.2-28.8 2.1-2.6 2.9-1.2 1.6.8m-2.8-2.8c-3.9 4.1-16.5 17.7-20.5 29.9-.7 2.1-2.8 3-1.7-.2 4-12 15.1-24.9 20.7-30.8 2.5-2.3 3-.8 1.5.9" class="st3"/></g></svg>';
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
  changeAutoIncrement: true,
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

  dropColumnDependencies: ['dependencies'],

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

  getTableFormOptions(intent) {
    return [
      {
        type: 'dropdowntext',
        options: this.getSupportedEngines(),
        label: 'Engine',
        name: 'tableEngine',
        sqlFormatString: '^engine = %s',
      },
      {
        type: 'text',
        label: 'Comment',
        name: 'objectComment',
        sqlFormatString: '^comment = %v',
        allowEmptyValue: true,
      },
    ];
  },
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
  showConnectionField: (field, values) => {
    if (['authType', 'user', 'defaultDatabase', 'singleDatabase', 'isReadOnly'].includes(field)) {
      return true;
    }

    if (values.authType == 'awsIam') {
      return ['awsRegion', 'secretAccessKey', 'accessKeyId', 'server', 'port'].includes(field);
    }

    if (['password'].includes(field)) {
      return true;
    }

    if (values.authType == 'socket') {
      return ['socketPath'].includes(field);
    }

    return ['server', 'port'].includes(field);
  },
  dumperClass: Dumper,
  defaultPort: 3306,
  getQuerySplitterOptions: usage =>
    usage == 'editor'
      ? { ...mysqlSplitterOptions, ignoreComments: true, preventSingleLineSplit: true }
      : mysqlSplitterOptions,

  readOnlySessions: true,
  supportsDatabaseBackup: true,
  supportsDatabaseRestore: true,
  authTypeLabel: 'Connection mode',
  defaultAuthTypeName: 'hostPort',
  defaultSocketPath: '/var/run/mysqld/mysqld.sock',
  supportsTransactions: true,
  supportsIncrementalAnalysis: true,

  getNewObjectTemplates() {
    return [
      { label: 'New view', sql: 'CREATE VIEW myview\nAS\nSELECT * FROM table1' },
      {
        label: 'New procedure',
        sql: 'DELIMITER //\n\nCREATE PROCEDURE myproc (IN arg1 INT)\nBEGIN\n  SELECT * FROM table1;\nEND\n\nDELIMITER ;',
      },
      { label: 'New function', sql: 'CREATE FUNCTION myfunc (arg1 INT)\nRETURNS INT DETERMINISTIC\nRETURN 1' },
      { label: 'New trigger', sql: 'CREATE TRIGGER myTrigger AFTER INSERT ON myTable FOR EACH ROW BEGIN\n END' },
      {
        label: 'New event',
        sql: 'CREATE EVENT `event_name`\nON SCHEDULE EVERY 1 HOUR\nDO\nBEGIN\n\nEND',
      },
    ];
  },
  getCliConnectionArgs(connection, externalTools) {
    const args = [`--user=${connection.user}`, `--password=${connection.password}`, `--host=${connection.server}`];
    if (connection.port) {
      args.push(`--port=${connection.port}`);
    }
    if (externalTools.mysqlPlugins) {
      args.push(`--plugin-dir=${externalTools.mysqlPlugins}`);
    }
    if (connection.server == 'localhost') {
      args.push(`--protocol=tcp`);
    }
    return args;
  },
  backupDatabaseCommand(connection, settings, externalTools) {
    const { outputFile, database, skippedTables, options } = settings;
    const command = externalTools.mysqldump || 'mysqldump';
    const args = this.getCliConnectionArgs(connection, externalTools);
    args.push(`--result-file=${outputFile}`);
    args.push('--verbose');
    for (const table of skippedTables) {
      args.push(`--ignore-table=${database}.${table.pureName}`);
    }
    if (options.noData) {
      args.push('--no-data');
    }
    if (options.noStructure) {
      args.push('--no-create-info');
    }
    if (options.includeEvents !== false && !options.noStructure) {
      args.push('--events');
    }
    if (options.includeRoutines !== false && !options.noStructure) {
      args.push('--routines');
    }
    if (options.includeTriggers !== false && !options.noStructure) {
      args.push('--triggers');
    }
    if (options.force) {
      args.push('--force');
    }
    if (options.lockTables) {
      args.push('--lock-tables');
    }
    if (options.skipLockTables) {
      args.push('--skip-lock-tables');
    }
    if (options.singleTransaction) {
      args.push('--single-transaction');
    }
    if (options.customArgs?.trim()) {
      const customArgs = options.customArgs.split(/\s+/).filter(arg => arg.trim() != '');
      args.push(...customArgs);
    }
    if (options.createDatabase) {
      args.push('--databases', database);
      if (options.dropDatabase) {
        args.push('--add-drop-database');
      }
    } else {
      args.push(database);
    }
    return { command, args };
  },
  restoreDatabaseCommand(connection, settings, externalTools) {
    const { inputFile, database } = settings;
    const command = externalTools.mysql || 'mysql';
    const args = this.getCliConnectionArgs(connection, externalTools);
    if (database) {
      args.push(database);
    }
    return { command, args, stdinFilePath: inputFile };
  },
  transformNativeCommandMessage(message) {
    if (message.message?.startsWith('--')) {
      if (message.message.startsWith('-- Retrieving table structure for table')) {
        return {
          ...message,
          severity: 'info',
          message: message.message.replace('-- Retrieving table structure for table', 'Processing table'),
        };
      } else {
        return {
          ...message,
          severity: 'debug',
          message: message.message.replace('-- ', ''),
        };
      }
    }
    return message;
  },
  getNativeOperationFormArgs(operation) {
    if (operation == 'backup') {
      return [
        {
          type: 'checkbox',
          label: 'No data (dump only structure)',
          name: 'noData',
          default: false,
        },
        {
          type: 'checkbox',
          label: 'No structure (dump only data)',
          name: 'noStructure',
          default: false,
        },
        {
          type: 'checkbox',
          label: 'Force (ignore all errors)',
          name: 'force',
          default: false,
        },
        {
          type: 'checkbox',
          label: 'Backup events',
          name: 'includeEvents',
          default: true,
          disabledFn: values => values.noStructure,
        },
        {
          type: 'checkbox',
          label: 'Backup routines',
          name: 'includeRoutines',
          default: true,
          disabledFn: values => values.noStructure,
        },
        {
          type: 'checkbox',
          label: 'Backup triggers',
          name: 'includeTriggers',
          default: true,
          disabledFn: values => values.noStructure,
        },
        {
          type: 'checkbox',
          label: 'Lock tables',
          name: 'lockTables',
          default: false,
          disabledFn: values => values.skipLockTables || values.singleTransaction,
        },
        {
          type: 'checkbox',
          label: 'Skip lock tables',
          name: 'skipLockTables',
          default: false,
          disabledFn: values => values.lockTables || values.singleTransaction,
        },
        {
          type: 'checkbox',
          label: 'Single transaction',
          name: 'singleTransaction',
          default: false,
          disabledFn: values => values.lockTables || values.skipLockTables,
        },
        {
          type: 'checkbox',
          label: 'Create database',
          name: 'createDatabase',
          default: false,
        },
        {
          type: 'checkbox',
          label: 'Drop database before import',
          name: 'dropDatabase',
          default: false,
          disabledFn: values => !values.createDatabase,
        },
        {
          type: 'text',
          label: 'Custom arguments',
          name: 'customArgs',
        },
      ];
    }
    return null;
  },

  adaptDataType(dataType) {
    if (dataType?.toLowerCase() == 'money') return 'decimal(15,2)';
    return dataType;
  },
};

/** @type {import('dbgate-types').EngineDriver} */
const mysqlDriver = {
  ...mysqlDriverBase,
  supportsServerSummary: true,
  dialect: mysqlDialect,
  engine: 'mysql@dbgate-plugin-mysql',
  title: 'MySQL',
  __analyserInternals: {
    quoteDefaultValues: true,
  },
  icon: mySqlIcon,
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
  supportsServerSummary: true,
  dialect: mariaDbDialect,
  engine: 'mariadb@dbgate-plugin-mysql',
  title: 'MariaDB',
  __analyserInternals: {
    quoteDefaultValues: false,
  },
  icon: mariaDbIcon,
};

module.exports = [mysqlDriver, mariaDriver];
