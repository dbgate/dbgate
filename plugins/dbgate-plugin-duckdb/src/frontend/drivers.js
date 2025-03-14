const { driverBase } = global.DBGATE_PACKAGES['dbgate-tools'];
const Dumper = require('./Dumper');
const { postgreSplitterOptions } = require('dbgate-query-splitter/lib/options');

const spatialTypes = ['GEOGRAPHY', 'GEOMETRY'];

/** @type {import('dbgate-types').SqlDialect} */
const dialect = {
  rangeSelect: true,
  ilike: true,
  defaultSchemaName: 'public',
  multipleSchema: true,
  // stringEscapeChar: '\\',
  stringEscapeChar: "'",
  fallbackDataType: 'varchar',
  anonymousPrimaryKey: false,
  enableConstraintsPerTable: true,
  dropColumnDependencies: ['dependencies'],
  quoteIdentifier(s) {
    return '"' + s + '"';
  },
  stringAgg: true,

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
  allowMultipleValuesInsert: true,
  renameSqlObject: true,
  filteredIndexes: true,

  dropReferencesWhenDropTable: true,
  requireStandaloneSelectForScopeIdentity: true,

//   predefinedDataTypes: ['integer', 'real', 'text', 'blob'],
  predefinedDataTypes: [
    'int8',
    'bytea',
    'bit',
    'bool',
    'varchar',
    'date',
    'timestamp',
    'numeric',
    'float8',
    'enum',
    'float4',
    'uuid',
    'hugeint',
    'int4',
    'tinyint',
    'int2',
    'interval',
    'list',
    'map',
    'null',
    'struct',
    'time',
    'timestamptz',
    'timestamp_ms',
    'timestamp_ns',
    'timestamp_s',
    'timetz',
    'bigint',
    'ubigint',
    'uhugeint',
    'usmallint',
    'uinteger',
    'utinyint',
    'union',
    'varint',
  ],

  createColumnViewExpression(columnName, dataType, source, alias, purpose) {
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

    if (dataType?.toLowerCase() == 'uuid' 
    || dataType?.toLowerCase() == 'bigint' 
    || (purpose == 'filter' && dataType?.toLowerCase()?.startsWith('json'))
    ) {
      return {
        exprType: 'unaryRaw',
        expr: {
          exprType: 'column',
          source,
          columnName,
        },
        afterSql: '::text',
        alias: alias || columnName,
      };
    }

    if (dataType?.toLowerCase()?.startsWith('struct')) {
      return {
        exprType: 'unaryRaw',
        expr: {
          exprType: 'column',
          source,
          columnName,
        },
        afterSql: '::json',
        alias: alias || columnName,
      };
    }
  },
};

const postgresDriverBase = {
  ...driverBase,
  dumperClass: Dumper,
  dialect,
  getQuerySplitterOptions: usage =>
    usage == 'editor'
      ? { ...postgreSplitterOptions, ignoreComments: true, preventSingleLineSplit: true }
      : usage == 'import'
      ? {
          ...postgreSplitterOptions,
          copyFromStdin: true,
        }
      : postgreSplitterOptions,
  readOnlySessions: true,

  databaseUrlPlaceholder: 'e.g. path/to/db.duckdb',

  // showConnectionField: (field, values) =>
  //   ['server', 'port', 'user', 'password', 'defaultDatabase', 'singleDatabase'].includes(field),
  showConnectionField: (field, values) => {
    const allowedFields = ['databaseUrl', 'password', 'isReadOnly'];
    return allowedFields.includes(field);
  },

  __analyserInternals: {},

  getNewObjectTemplates() {
    return [
      { label: 'New view', sql: 'CREATE VIEW myview\nAS\nSELECT * FROM table1' },
      { label: 'New materialized view', sql: 'CREATE MATERIALIZED VIEW myview\nAS\nSELECT * FROM table1' },
      {
        label: 'New procedure',
        sql: `CREATE PROCEDURE myproc (arg1 INT)
LANGUAGE SQL 
AS $$
  SELECT * FROM table1;
$$`,
      },
      {
        label: 'New function (plpgsql)',
        sql: `CREATE FUNCTION myfunc (arg1 INT)
RETURNS INT
AS $$
BEGIN
  RETURN 1;
END
$$ LANGUAGE plpgsql;`,
      },
      {
        label: 'New trigger',
        sql: `CREATE TRIGGER trigger_name
BEFORE INSERT ON table_name
FOR EACH ROW
EXECUTE FUNCTION function_name();`,
      },
    ];
  },

  authTypeLabel: 'Connection mode',
  defaultAuthTypeName: 'hostPort',
  defaultSocketPath: '/var/run/postgresql',
};

/** @type {import('dbgate-types').EngineDriver} */
const duckdbDriver = {
  ...postgresDriverBase,
  engine: 'duckdb@dbgate-plugin-duckdb',
  title: 'DuckDB',
  databaseUrlPlaceholder: 'e.g. :memory:',
  defaultPort: 5432,
  dialect: {
    ...dialect,
    materializedViews: true,
  },

  dialectByVersion(version) {
    if (version) {
      return {
        ...dialect,
        materializedViews: true,
        isFipsComplianceOn: version.isFipsComplianceOn,
      };
    }
    return dialect;
  },
};

module.exports = [duckdbDriver];
