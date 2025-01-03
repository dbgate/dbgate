const { driverBase } = global.DBGATE_PACKAGES['dbgate-tools'];
const MsSqlDumper = require('./MsSqlDumper');
const { mssqlSplitterOptions } = require('dbgate-query-splitter/lib/options');

const spatialTypes = ['GEOGRAPHY'];

/** @type {import('dbgate-types').SqlDialect} */
const dialect = {
  limitSelect: true,
  rangeSelect: true,
  topRecords: true,
  offsetFetchRangeSyntax: true,
  rowNumberOverPaging: true,
  defaultSchemaName: 'dbo',
  multipleSchema: true,
  stringEscapeChar: "'",
  fallbackDataType: 'nvarchar(max)',
  explicitDropConstraint: false,
  enableConstraintsPerTable: true,
  dropColumnDependencies: ['default', 'dependencies', 'indexes', 'primaryKey', 'foreignKeys', 'uniques'],
  changeColumnDependencies: ['indexes', 'dependencies', 'uniques'],
  anonymousPrimaryKey: false,
  dropIndexContainsTableSpec: true,
  quoteIdentifier(s) {
    return `[${s}]`;
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
  createUnique: true,
  dropUnique: true,
  createCheck: true,
  dropCheck: true,
  renameSqlObject: true,
  filteredIndexes: true,

  dropReferencesWhenDropTable: true,
  namedDefaultConstraint: true,

  columnProperties: {
    isSparse: true,
    isPersisted: true,
  },

  predefinedDataTypes: [
    'bigint',
    'bit',
    'decimal(10,2)',
    'int',
    'money',
    'numeric',
    'smallint',
    'smallmoney',
    'tinyint',
    'float',
    'real',
    'date',
    'datetime2',
    'datetime',
    'datetimeoffset',
    'smalldatetime',
    'time',
    'char(20)',
    'varchar(250)',
    'text',
    'nchar(20)',
    'nvarchar(250)',
    'ntext',
    'binary(100)',
    'varbinary(100)',
    'image',
    'xml',
  ],

  createColumnViewExpression(columnName, dataType, source, alias) {
    if (dataType && spatialTypes.includes(dataType.toUpperCase())) {
      return {
        exprType: 'methodCall',
        method: 'STAsText',
        alias: alias || columnName,
        thisObject: {
          exprType: 'column',
          columnName,
          source,
        },
      };
    }
    if (dataType && dataType.toUpperCase() == 'XML') {
      return {
        exprType: 'call',
        func: 'CONVERT',
        alias: alias || columnName,
        args: [
          {
            exprType: 'raw',
            sql: 'NVARCHAR(MAX)',
          },
          {
            exprType: 'column',
            columnName,
            source,
          },
        ],
      };
    }
  },
};

/** @type {import('dbgate-types').EngineDriver} */
const driver = {
  ...driverBase,
  dumperClass: MsSqlDumper,
  dialect,
  readOnlySessions: false,
  requiresDefaultSortCriteria: true,
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
  showConnectionField: (field, values) =>
    [
      'authType',
      'server',
      'port',
      'user',
      'password',
      'defaultDatabase',
      'singleDatabase',
      'isReadOnly',
      'useSeparateSchemas',
    ].includes(field) ||
    (field == 'trustServerCertificate' && values.authType != 'sql' && values.authType != 'sspi') ||
    (field == 'windowsDomain' && values.authType != 'sql' && values.authType != 'sspi' && values.authType != 'msentra'),
  // (field == 'useDatabaseUrl' && values.authType != 'sql' && values.authType != 'sspi')
  getQuerySplitterOptions: usage =>
    usage == 'editor'
      ? { ...mssqlSplitterOptions, adaptiveGoSplit: true, ignoreComments: true, preventSingleLineSplit: true }
      : mssqlSplitterOptions,

  engine: 'mssql@dbgate-plugin-mssql',
  title: 'Microsoft SQL Server',
  defaultPort: 1433,
  defaultAuthTypeName: 'tedious',
  supportsTransactions: true,
  // databaseUrlPlaceholder: 'e.g. server=localhost&authentication.type=default&authentication.type.user=myuser&authentication.type.password=pwd&options.database=mydb',

  getNewObjectTemplates() {
    return [
      { label: 'New view', sql: 'CREATE VIEW myview\nAS\nSELECT * FROM table1' },
      { label: 'New procedure', sql: 'CREATE PROCEDURE myproc (@arg1 INT)\nAS\nBEGIN\n  SELECT * FROM table1\nEND' },
      { label: 'New function', sql: 'CREATE FUNCTION myfunc (@arg1 INT) RETURNS INT\nAS\nBEGIN\n  RETURN 1;\nEND' },
      {
        label: 'New table valued function',
        sql: 'CREATE FUNCTION myfunc (@arg1 INT) RETURNS TABLE \nAS\nRETURN SELECT * FROM table1',
      },
      {
        label: 'New trigger',
        sql: 'CREATE TRIGGER trigger_name\nON table_name AFTER INSERT AS\nBEGIN\nSELECT * FROM table_name\nEND',
      },
    ];
  },

  beforeConnectionSave: connection => {
    return {
      ...connection,
      useRedirectDbLogin: connection.authType == 'msentra' ? 1 : 0,
    };
  },
};

module.exports = driver;
