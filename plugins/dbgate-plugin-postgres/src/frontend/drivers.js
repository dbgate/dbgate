const { driverBase } = global.DBGATE_TOOLS;
const Dumper = require('./Dumper');
const { postgreSplitterOptions } = require('dbgate-query-splitter/lib/options');

/** @type {import('dbgate-types').SqlDialect} */
const dialect = {
  rangeSelect: true,
  ilike: true,
  // stringEscapeChar: '\\',
  stringEscapeChar: "'",
  fallbackDataType: 'varchar',
  anonymousPrimaryKey: true,
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

  dropReferencesWhenDropTable: true,

  predefinedDataTypes: [
    'bigint',
    'bigserial',
    'bit',
    'varbit',
    'boolean',
    'box',
    'bytea',
    'char(20)',
    'varchar(250)',
    'cidr',
    'circle',
    'date',
    'double precision',
    'inet',
    'int',
    'interval',
    'json',
    'jsonb',
    'line',
    'lseg',
    'macaddr',
    'macaddr8',
    'money',
    'numeric(10,2)',
    'path',
    'pg_lsn',
    'pg_snapshot',
    'point',
    'polygon',
    'real',
    'smallint',
    'smallserial',
    'serial',
    'text',
    'time',
    'timetz',
    'timestamp',
    'timestamptz',
    'tsquery',
    'tsvector',
    'txid_snapshot',
    'uuid',
    'xml',
  ],
};

const postgresDriverBase = {
  ...driverBase,
  dumperClass: Dumper,
  dialect,
  // showConnectionField: (field, values) =>
  //   ['server', 'port', 'user', 'password', 'defaultDatabase', 'singleDatabase'].includes(field),
  getQuerySplitterOptions: () => postgreSplitterOptions,
  readOnlySessions: true,

  databaseUrlPlaceholder: 'e.g. postgresql://user:password@localhost:5432/default_database',

  showConnectionField: (field, values) => {
    if (field == 'useDatabaseUrl') return true;
    if (values.useDatabaseUrl) {
      return ['databaseUrl', 'isReadOnly'].includes(field);
    }
    return ['server', 'port', 'user', 'password', 'defaultDatabase', 'singleDatabase', 'isReadOnly'].includes(field);
  },

  beforeConnectionSave: connection => {
    const { databaseUrl } = connection;
    if (databaseUrl) {
      const m = databaseUrl.match(/\/([^/]+)($|\?)/);
      return {
        ...connection,
        singleDatabase: !!m,
        defaultDatabase: m ? m[1] : null,
      };
    }
    return connection;
  },

  __analyserInternals: {
    refTableCond: '',
  },

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
    ];
  },
};

/** @type {import('dbgate-types').EngineDriver} */
const postgresDriver = {
  ...postgresDriverBase,
  engine: 'postgres@dbgate-plugin-postgres',
  title: 'PostgreSQL',
  defaultPort: 5432,
  dialect: {
    ...dialect,
    materializedViews: true,
  },

  dialectByVersion(version) {
    if (version) {
      return {
        ...dialect,
        materializedViews:
          version &&
          version.versionMajor != null &&
          version.versionMinor != null &&
          (version.versionMajor > 9 || version.versionMajor == 9 || version.versionMinor >= 3),
      };
    }
    return dialect;
  },
};

/** @type {import('dbgate-types').EngineDriver} */
const cockroachDriver = {
  ...postgresDriverBase,
  engine: 'cockroach@dbgate-plugin-postgres',
  title: 'CockroachDB',
  defaultPort: 26257,
  dialect: {
    ...dialect,
    materializedViews: true,
    dropColumnDependencies: ['primaryKey', 'dependencies'],
    dropPrimaryKey: false,
  },
  __analyserInternals: {
    refTableCond: 'and fk.referenced_table_name = ref.table_name',
  },
};

/** @type {import('dbgate-types').EngineDriver} */
const redshiftDriver = {
  ...postgresDriverBase,
  dialect: {
    ...dialect,
    stringAgg: false,
  },
  __analyserInternals: {
    refTableCond: '',
    skipIndexes: true,
  },
  engine: 'redshift@dbgate-plugin-postgres',
  title: 'Amazon Redshift',
  defaultPort: 5439,
  databaseUrlPlaceholder: 'e.g. redshift-cluster-1.xxxx.redshift.amazonaws.com:5439/dev',
  showConnectionField: (field, values) => ['databaseUrl', 'user', 'password', 'isReadOnly'].includes(field),
  beforeConnectionSave: connection => {
    const { databaseUrl } = connection;
    if (databaseUrl) {
      const m = databaseUrl.match(/\/([^/]+)$/);
      if (m) {
        return {
          ...connection,
          singleDatabase: true,
          defaultDatabase: m[1],
          // displayName: connection.displayName || `${m[1]} on Amazon Redshift`,
        };
      }
    }
    return connection;
  },
};

module.exports = [postgresDriver, cockroachDriver, redshiftDriver];
