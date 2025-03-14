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

    if (dataType?.toLowerCase() == 'uuid' || (purpose == 'filter' && dataType?.toLowerCase()?.startsWith('json'))) {
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
  },
};

const postgresDriverBase = {
  ...driverBase,
  supportsTransactions: true,
  dumperClass: Dumper,
  dialect,
  // showConnectionField: (field, values) =>
  //   ['server', 'port', 'user', 'password', 'defaultDatabase', 'singleDatabase'].includes(field),
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

  databaseUrlPlaceholder: 'e.g. postgresql://user:password@localhost:5432/default_database',

  showConnectionField: (field, values) => {
    const allowedFields = ['useDatabaseUrl', 'authType', 'user', 'isReadOnly', 'useSeparateSchemas'];

    if (values.authType == 'awsIam') {
      allowedFields.push('awsRegion', 'secretAccessKey', 'accessKeyId');
    }

    if (values.authType == 'socket') {
      allowedFields.push('socketPath');
    } else {
      if (values.useDatabaseUrl) {
        allowedFields.push('databaseUrl');
      } else {
        allowedFields.push('server', 'port');
      }
    }

    if (values.authType != 'awsIam' && values.authType != 'socket') {
      allowedFields.push('password');
    }

    if (!values.useDatabaseUrl) {
      allowedFields.push('defaultDatabase', 'singleDatabase');
    }

    return allowedFields.includes(field);
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

  supportsDatabaseBackup: true,
  supportsDatabaseRestore: true,

  adaptDataType(dataType) {
    if (dataType?.toLowerCase() == 'datetime') return 'timestamp';
    return dataType;
  },

  getCliConnectionArgs(connection) {
    const args = [`--username=${connection.user}`, `--host=${connection.server}`];
    if (connection.port) {
      args.push(`--port=${connection.port}`);
    }
    return args;
  },

  getNativeOperationFormArgs(operation) {
    if (operation == 'backup') {
      return [
        {
          type: 'checkbox',
          label: 'Dump only data (without structure)',
          name: 'dataOnly',
          default: false,
        },
        {
          type: 'checkbox',
          label: 'Dump schema only (no data)',
          name: 'schemaOnly',
          default: false,
        },
        {
          type: 'checkbox',
          label: 'Use SQL insert instead of COPY for rows',
          name: 'insert',
          default: false,
        },
        {
          type: 'checkbox',
          label: 'Prevent dumping of access privileges (grant/revoke)',
          name: 'noPrivileges',
          default: false,
        },
        {
          type: 'checkbox',
          label: 'Do not output commands to set ownership of objects ',
          name: 'noOwner',
          default: false,
        },
      ];
    }
    return null;
  },

  backupDatabaseCommand(connection, settings, externalTools) {
    const { outputFile, database, selectedTables, skippedTables, options, argsFormat } = settings;
    const command = externalTools.pg_dump || 'pg_dump';
    const args = this.getCliConnectionArgs(connection, externalTools);
    args.push(`--file=${outputFile}`);
    args.push('--verbose');
    args.push(database);

    if (options.dataOnly) {
      args.push(`--data-only`);
    }
    if (options.schemaOnly) {
      args.push(`--schema-only`);
    }
    if (options.insert) {
      args.push(`--insert`);
    }
    if (options.noPrivileges) {
      args.push(`--no-privileges`);
    }
    if (options.noOwner) {
      args.push(`--no-owner`);
    }
    if (skippedTables.length > 0) {
      for (const table of selectedTables) {
        args.push(
          argsFormat == 'spawn'
            ? `--table="${table.schemaName}"."${table.pureName}"`
            : `--table='"${table.schemaName}"."${table.pureName}"'`
        );
      }
    }

    return {
      command,
      args,
      env: { PGPASSWORD: connection.password },
    };
  },
  restoreDatabaseCommand(connection, settings, externalTools) {
    const { inputFile, database } = settings;
    const command = externalTools.psql || 'psql';
    const args = this.getCliConnectionArgs(connection, externalTools);
    args.push(`--dbname=${database}`);
    // args.push('--verbose');
    args.push(`--file=${inputFile}`);
    return {
      command,
      args,
      env: { PGPASSWORD: connection.password },
    };
  },
  transformNativeCommandMessage(message) {
    if (message.message.startsWith('INSERT ') || message.message == 'SET') {
      return null;
    }
    if (message.message.startsWith('pg_dump: processing data for table')) {
      return {
        ...message,
        severity: 'info',
        message: message.message.replace('pg_dump: processing data for table', 'Processing table'),
      };
    } else if (message.message.toLowerCase().includes('error:')) {
      return {
        ...message,
        severity: 'error',
      };
    } else {
      return {
        ...message,
        severity: 'debug',
      };
    }
    return message;
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
        isFipsComplianceOn: version.isFipsComplianceOn,
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
  __analyserInternals: {},
};

/** @type {import('dbgate-types').EngineDriver} */
const redshiftDriver = {
  ...postgresDriverBase,
  dialect: {
    ...dialect,
    stringAgg: false,
  },
  __analyserInternals: {
    skipIndexes: true,
  },
  engine: 'redshift@dbgate-plugin-postgres',
  title: 'Amazon Redshift',
  defaultPort: 5439,
  premiumOnly: true,
  databaseUrlPlaceholder: 'e.g. redshift-cluster-1.xxxx.redshift.amazonaws.com:5439/dev',
  showConnectionField: (field, values) =>
    ['databaseUrl', 'user', 'password', 'isReadOnly', 'useSeparateSchemas'].includes(field),
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
