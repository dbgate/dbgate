const { driverBase } = global.DBGATE_PACKAGES['dbgate-tools'];
const Dumper = require('./Dumper');
const { postgreSplitterOptions } = require('dbgate-query-splitter/lib/options');
const postgresIcon = '<svg width="432.071pt" height="445.383pt" viewBox="0 0 432.071 445.383" xml:space="preserve" xmlns="http://www.w3.org/2000/svg"><g id="orginal" style="fill-rule:nonzero;clip-rule:nonzero;stroke:#000000;stroke-miterlimit:4;"></g><g id="Layer_x0020_3" style="fill-rule:nonzero;clip-rule:nonzero;fill:none;stroke:#FFFFFF;stroke-width:12.4651;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;"><path style="fill:#000000;stroke:#000000;stroke-width:37.3953;stroke-linecap:butt;stroke-linejoin:miter;" d="M323.205,324.227c2.833-23.601,1.984-27.062,19.563-23.239l4.463,0.392c13.517,0.615,31.199-2.174,41.587-7c22.362-10.376,35.622-27.7,13.572-23.148c-50.297,10.376-53.755-6.655-53.755-6.655c53.111-78.803,75.313-178.836,56.149-203.322    C352.514-5.534,262.036,26.049,260.522,26.869l-0.482,0.089c-9.938-2.062-21.06-3.294-33.554-3.496c-22.761-0.374-40.032,5.967-53.133,15.904c0,0-161.408-66.498-153.899,83.628c1.597,31.936,45.777,241.655,98.47,178.31    c19.259-23.163,37.871-42.748,37.871-42.748c9.242,6.14,20.307,9.272,31.912,8.147l0.897-0.765c-0.281,2.876-0.157,5.689,0.359,9.019c-13.572,15.167-9.584,17.83-36.723,23.416c-27.457,5.659-11.326,15.734-0.797,18.367c12.768,3.193,42.305,7.716,62.268-20.224    l-0.795,3.188c5.325,4.26,4.965,30.619,5.72,49.452c0.756,18.834,2.017,36.409,5.856,46.771c3.839,10.36,8.369,37.05,44.036,29.406c29.809-6.388,52.6-15.582,54.677-101.107"/><path style="fill:#336791;stroke:none;" d="M402.395,271.23c-50.302,10.376-53.76-6.655-53.76-6.655c53.111-78.808,75.313-178.843,56.153-203.326c-52.27-66.785-142.752-35.2-144.262-34.38l-0.486,0.087c-9.938-2.063-21.06-3.292-33.56-3.496c-22.761-0.373-40.026,5.967-53.127,15.902    c0,0-161.411-66.495-153.904,83.63c1.597,31.938,45.776,241.657,98.471,178.312c19.26-23.163,37.869-42.748,37.869-42.748c9.243,6.14,20.308,9.272,31.908,8.147l0.901-0.765c-0.28,2.876-0.152,5.689,0.361,9.019c-13.575,15.167-9.586,17.83-36.723,23.416    c-27.459,5.659-11.328,15.734-0.796,18.367c12.768,3.193,42.307,7.716,62.266-20.224l-0.796,3.188c5.319,4.26,9.054,27.711,8.428,48.969c-0.626,21.259-1.044,35.854,3.147,47.254c4.191,11.4,8.368,37.05,44.042,29.406c29.809-6.388,45.256-22.942,47.405-50.555    c1.525-19.631,4.976-16.729,5.194-34.28l2.768-8.309c3.192-26.611,0.507-35.196,18.872-31.203l4.463,0.392c13.517,0.615,31.208-2.174,41.591-7c22.358-10.376,35.618-27.7,13.573-23.148z"/><path d="M215.866,286.484c-1.385,49.516,0.348,99.377,5.193,111.495c4.848,12.118,15.223,35.688,50.9,28.045c29.806-6.39,40.651-18.756,45.357-46.051c3.466-20.082,10.148-75.854,11.005-87.281"/><path d="M173.104,38.256c0,0-161.521-66.016-154.012,84.109c1.597,31.938,45.779,241.664,98.473,178.316c19.256-23.166,36.671-41.335,36.671-41.335"/><path d="M260.349,26.207c-5.591,1.753,89.848-34.889,144.087,34.417c19.159,24.484-3.043,124.519-56.153,203.329"/><path style="stroke-linejoin:bevel;" d="M348.282,263.953c0,0,3.461,17.036,53.764,6.653c22.04-4.552,8.776,12.774-13.577,23.155c-18.345,8.514-59.474,10.696-60.146-1.069c-1.729-30.355,21.647-21.133,19.96-28.739c-1.525-6.85-11.979-13.573-18.894-30.338    c-6.037-14.633-82.796-126.849,21.287-110.183c3.813-0.789-27.146-99.002-124.553-100.599c-97.385-1.597-94.19,119.762-94.19,119.762"/><path d="M188.604,274.334c-13.577,15.166-9.584,17.829-36.723,23.417c-27.459,5.66-11.326,15.733-0.797,18.365c12.768,3.195,42.307,7.718,62.266-20.229c6.078-8.509-0.036-22.086-8.385-25.547c-4.034-1.671-9.428-3.765-16.361,3.994z"/><path d="M187.715,274.069c-1.368-8.917,2.93-19.528,7.536-31.942c6.922-18.626,22.893-37.255,10.117-96.339c-9.523-44.029-73.396-9.163-73.436-3.193c-0.039,5.968,2.889,30.26-1.067,58.548c-5.162,36.913,23.488,68.132,56.479,64.938"/><path style="fill:#FFFFFF;stroke-width:4.155;stroke-linecap:butt;stroke-linejoin:miter;" d="M172.517,141.7c-0.288,2.039,3.733,7.48,8.976,8.207c5.234,0.73,9.714-3.522,9.998-5.559c0.284-2.039-3.732-4.285-8.977-5.015c-5.237-0.731-9.719,0.333-9.996,2.367z"/><path style="fill:#FFFFFF;stroke-width:2.0775;stroke-linecap:butt;stroke-linejoin:miter;" d="M331.941,137.543c0.284,2.039-3.732,7.48-8.976,8.207c-5.238,0.73-9.718-3.522-10.005-5.559c-0.277-2.039,3.74-4.285,8.979-5.015c5.239-0.73,9.718,0.333,10.002,2.368z"/><path d="M350.676,123.432c0.863,15.994-3.445,26.888-3.988,43.914c-0.804,24.748,11.799,53.074-7.191,81.435"/><path style="stroke-width:3;" d="M0,60.232"/></g></svg>'
const cockroachIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 31.82 32" width="2486" height="2500"><title>CL</title><path d="M19.42 9.17a15.39 15.39 0 0 1-3.51.4 15.46 15.46 0 0 1-3.51-.4 15.63 15.63 0 0 1 3.51-3.91 15.71 15.71 0 0 1 3.51 3.91zM30 .57A17.22 17.22 0 0 0 25.59 0a17.4 17.4 0 0 0-9.68 2.93A17.38 17.38 0 0 0 6.23 0a17.22 17.22 0 0 0-4.44.57A16.22 16.22 0 0 0 0 1.13a.07.07 0 0 0 0 .09 17.32 17.32 0 0 0 .83 1.57.07.07 0 0 0 .08 0 16.39 16.39 0 0 1 1.81-.54 15.65 15.65 0 0 1 11.59 1.88 17.52 17.52 0 0 0-3.78 4.48c-.2.32-.37.65-.55 1s-.22.45-.33.69-.31.72-.44 1.08a17.46 17.46 0 0 0 4.29 18.7c.26.25.53.49.81.73s.44.37.67.54.59.44.89.64a.07.07 0 0 0 .08 0c.3-.21.6-.42.89-.64s.45-.35.67-.54.55-.48.81-.73a17.45 17.45 0 0 0 5.38-12.61 17.39 17.39 0 0 0-1.09-6.09c-.14-.37-.29-.73-.45-1.09s-.22-.47-.33-.69-.35-.66-.55-1a17.61 17.61 0 0 0-3.78-4.48 15.65 15.65 0 0 1 11.6-1.84 16.13 16.13 0 0 1 1.81.54.07.07 0 0 0 .08 0q.44-.76.82-1.56a.07.07 0 0 0 0-.09A16.89 16.89 0 0 0 30 .57z" fill="#151f34"/><path d="M21.82 17.47a15.51 15.51 0 0 1-4.25 10.69 15.66 15.66 0 0 1-.72-4.68 15.5 15.5 0 0 1 4.25-10.69 15.62 15.62 0 0 1 .72 4.68" fill="#348540"/><path d="M15 23.48a15.55 15.55 0 0 1-.72 4.68 15.54 15.54 0 0 1-3.53-15.37A15.5 15.5 0 0 1 15 23.48" fill="#7dbc42"/></svg>';
const redshiftIcon = '<svg enable-background="new 0 0 1615 1783.7" viewBox="0 0 1615 1783.7" xmlns="http://www.w3.org/2000/svg"><path d="m807.5 1363.8 678.3 161.5v-1270.5l-678.3 161.5z" fill="#205b97"/><path d="m1485.8 254.8 129.2 64.6v1141.3l-129.2 64.6zm-678.3 1109-678.3 161.5v-1270.5l678.3 161.5z" fill="#5193ce"/><path d="m129.2 254.8-129.2 64.6v1141.3l129.2 64.6z" fill="#205b97"/><path d="m979.8 1783.7 258.4-129.2v-1525.3l-258.4-129.2-79 847z" fill="#5193ce"/><path d="m635.2 1783.7-258.4-129.2v-1525.3l258.4-129.2 79 847z" fill="#205b97"/><path d="m635.2 0h348.1v1780.1h-348.1z" fill="#2e73b7"/></svg>';
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
  supportsIncrementalAnalysis: true,
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
        {
          type: 'text',
          label: 'Custom arguments',
          name: 'customArgs',
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
    if (options.customArgs?.trim()) {
      const customArgs = options.customArgs.split(/\s+/).filter(arg => arg.trim() != '');
      args.push(...customArgs);
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
  supportsServerSummary: true,
  engine: 'postgres@dbgate-plugin-postgres',
  title: 'PostgreSQL',
  defaultPort: 5432,
  dialect: {
    ...dialect,
    materializedViews: true,
  },
  icon : postgresIcon,
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
  supportsServerSummary: true,
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
  icon: cockroachIcon,
};

/** @type {import('dbgate-types').EngineDriver} */
const redshiftDriver = {
  ...postgresDriverBase,
  supportsServerSummary: true,
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
  icon: redshiftIcon,
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
