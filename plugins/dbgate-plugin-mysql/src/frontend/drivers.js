const { driverBase } = global.DBGATE_PACKAGES['dbgate-tools'];
const { mysqlSplitterOptions } = require('dbgate-query-splitter/lib/options');
const Dumper = require('./Dumper');
const mySqlIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path fill="#00618A" d="M116.948 97.807c-6.863-.187-12.104.452-16.585 2.341-1.273.537-3.305.552-3.513 2.147.7.733.809 1.829 1.365 2.731 1.07 1.73 2.876 4.052 4.488 5.268 1.762 1.33 3.577 2.751 5.465 3.902 3.358 2.047 7.107 3.217 10.34 5.268 1.906 1.21 3.799 2.733 5.658 4.097.92.675 1.537 1.724 2.732 2.147v-.194c-.628-.8-.79-1.898-1.366-2.733l-2.537-2.537c-2.48-3.292-5.629-6.184-8.976-8.585-2.669-1.916-8.642-4.504-9.755-7.609l-.195-.195c1.892-.214 4.107-.898 5.854-1.367 2.934-.786 5.556-.583 8.585-1.365l4.097-1.171v-.78c-1.531-1.571-2.623-3.651-4.292-5.073-4.37-3.72-9.138-7.437-14.048-10.537-2.724-1.718-6.089-2.835-8.976-4.292-.971-.491-2.677-.746-3.318-1.562-1.517-1.932-2.342-4.382-3.511-6.633-2.449-4.717-4.854-9.868-7.024-14.831-1.48-3.384-2.447-6.72-4.293-9.756-8.86-14.567-18.396-23.358-33.169-32-3.144-1.838-6.929-2.563-10.929-3.513-2.145-.129-4.292-.26-6.438-.391-1.311-.546-2.673-2.149-3.902-2.927C17.811 4.565 5.257-2.16 1.633 6.682c-2.289 5.581 3.421 11.025 5.462 13.854 1.434 1.982 3.269 4.207 4.293 6.438.674 1.467.79 2.938 1.367 4.489 1.417 3.822 2.652 7.98 4.487 11.511.927 1.788 1.949 3.67 3.122 5.268.718.981 1.951 1.413 2.145 2.927-1.204 1.686-1.273 4.304-1.95 6.44-3.05 9.615-1.899 21.567 2.537 28.683 1.36 2.186 4.567 6.871 8.975 5.073 3.856-1.57 2.995-6.438 4.098-10.732.249-.973.096-1.689.585-2.341v.195l3.513 7.024c2.6 4.187 7.212 8.562 11.122 11.514 2.027 1.531 3.623 4.177 6.244 5.073v-.196h-.195c-.508-.791-1.303-1.119-1.951-1.755-1.527-1.497-3.225-3.358-4.487-5.073-3.556-4.827-6.698-10.11-9.561-15.609-1.368-2.627-2.557-5.523-3.709-8.196-.444-1.03-.438-2.589-1.364-3.122-1.263 1.958-3.122 3.542-4.098 5.854-1.561 3.696-1.762 8.204-2.341 12.878-.342.122-.19.038-.391.194-2.718-.655-3.672-3.452-4.683-5.853-2.554-6.07-3.029-15.842-.781-22.829.582-1.809 3.21-7.501 2.146-9.172-.508-1.666-2.184-2.63-3.121-3.903-1.161-1.574-2.319-3.646-3.124-5.464-2.09-4.731-3.066-10.044-5.267-14.828-1.053-2.287-2.832-4.602-4.293-6.634-1.617-2.253-3.429-3.912-4.683-6.635-.446-.968-1.051-2.518-.391-3.513.21-.671.508-.951 1.171-1.17 1.132-.873 4.284.29 5.462.779 3.129 1.3 5.741 2.538 8.392 4.294 1.271.844 2.559 2.475 4.097 2.927h1.756c2.747.631 5.824.195 8.391.975 4.536 1.378 8.601 3.523 12.292 5.854 11.246 7.102 20.442 17.21 26.732 29.269 1.012 1.942 1.45 3.794 2.341 5.854 1.798 4.153 4.063 8.426 5.852 12.488 1.786 4.052 3.526 8.141 6.05 11.513 1.327 1.772 6.451 2.723 8.781 3.708 1.632.689 4.307 1.409 5.854 2.34 2.953 1.782 5.815 3.903 8.586 5.855 1.383.975 5.64 3.116 5.852 4.879zM29.729 23.466c-1.431-.027-2.443.156-3.513.389v.195h.195c.683 1.402 1.888 2.306 2.731 3.513.65 1.367 1.301 2.732 1.952 4.097l.194-.193c1.209-.853 1.762-2.214 1.755-4.294-.484-.509-.555-1.147-.975-1.755-.556-.811-1.635-1.272-2.339-1.952z"/></svg>';

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
};

module.exports = [mysqlDriver, mariaDriver];
