const { driverBase } = global.DBGATE_PACKAGES['dbgate-tools'];
const Dumper = require('./Dumper');
const { postgreSplitterOptions } = require('dbgate-query-splitter/lib/options');
const postgresIcon = '<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="200" height="200" viewBox="0,0,256,256"><g fill="none" fill-rule="nonzero" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal"><g transform="scale(5.33333,5.33333)"><path d="M44.083,29.79c-0.183,-0.829 -0.935,-1.796 -2.452,-1.796c-0.31,0 -0.649,0.039 -1.035,0.119c-0.708,0.146 -1.311,0.217 -1.842,0.241c4.133,-7.04 6.816,-16.819 4.159,-20.214c-3.501,-4.473 -8.214,-5.141 -10.711,-5.141l-0.235,0.001c-0.929,0.015 -1.893,0.129 -2.863,0.339l-3.583,0.774c-0.488,-0.061 -0.985,-0.104 -1.503,-0.113h-0.03h-0.016l-0.152,-0.001c-1.593,0 -3.046,0.338 -4.341,0.973l-1.251,-0.493c-1.72,-0.678 -4.308,-1.485 -6.868,-1.485c-0.144,0 -0.287,0.003 -0.431,0.008c-2.522,0.091 -4.688,1.048 -6.265,2.767c-1.968,2.146 -2.864,5.285 -2.661,9.331c0.01,0.209 2.458,20.9 9.397,20.9h0.025l0.064,-0.001c0.901,-0.022 1.76,-0.384 2.563,-1.077c0.613,0.46 1.406,0.732 2.145,0.84c0.488,0.115 1.366,0.278 2.418,0.278c1.284,0 2.442,-0.263 3.44,-0.738c-0.001,0.88 -0.006,1.994 -0.016,3.418l-0.001,0.075l0.005,0.075c0.097,1.419 0.342,2.698 0.711,3.701c1.051,2.859 2.866,4.434 5.111,4.434c0.093,0 0.188,-0.003 0.284,-0.009c1.846,-0.114 3.717,-1.151 5.004,-2.772c1.393,-1.755 1.715,-3.607 1.839,-5.026l0.008,-0.087v-0.088v-4.079l0.103,0.01l0.436,0.038l0.042,0.004l0.042,0.002c0.124,0.006 0.252,0.008 0.381,0.008c1.507,0 3.362,-0.391 4.616,-0.974c1.199,-0.556 3.939,-2.084 3.463,-4.242z" fill-opacity="0" fill="#ffffff"></path><path d="M33,34c0,-0.205 0.012,-0.376 0.018,-0.565c-0.01,-0.251 -0.018,-0.435 -0.018,-0.435c0,0 0.012,-0.009 0.032,-0.022c0.149,-2.673 0.886,-3.703 1.675,-4.29c-0.11,-0.153 -0.237,-0.318 -0.356,-0.475c-0.333,-0.437 -0.748,-0.979 -1.192,-1.674l-0.082,-0.158c-0.067,-0.164 -0.229,-0.447 -0.435,-0.819c-1.183,-2.14 -3.645,-6.592 -1.96,-9.404c0.738,-1.232 2.122,-1.942 4.121,-2.117c-0.817,-2.323 -3.878,-7.926 -10.818,-8.041c-0.002,0 -0.004,0 -0.006,0c-6.041,-0.098 -8.026,5.392 -8.672,8.672c0.89,-0.377 1.906,-0.606 2.836,-0.606c0.014,0 0.029,0 0.043,0c2.29,0.017 3.865,1.239 4.323,3.354c0.335,1.552 0.496,2.91 0.492,4.153c-0.01,2.719 -0.558,4.149 -1.042,5.411l-0.154,0.408c-0.124,0.334 -0.255,0.645 -0.379,0.937c-0.126,0.298 -0.237,0.563 -0.318,0.802c0.484,0.11 0.864,0.265 1.125,0.38l0.151,0.066c0.047,0.02 0.094,0.043 0.137,0.069c0.848,0.516 1.376,1.309 1.489,2.233c0.061,0.498 0.051,3.893 0.03,6.855c0.087,1.285 0.305,2.364 0.593,3.146c0.409,1.114 1.431,3.241 3.394,3.119c1.37,-0.085 2.687,-0.919 3.561,-2.019c0.938,-1.181 1.284,-2.487 1.414,-3.958v-5.022z" fill="#0277bd"></path><path d="M15.114,28.917c-1.613,-1.683 -2.399,-3.947 -2.104,-6.056c0.285,-2.035 0.124,-4.027 0.037,-5.098c-0.029,-0.357 -0.048,-0.623 -0.047,-0.77c0,-0.008 0.002,-0.015 0.003,-0.023c0,-0.004 -0.002,-0.007 -0.002,-0.011c0.121,-3.021 1.286,-7.787 4.493,-10.62c-1.562,-0.615 -4.106,-1.426 -6.494,-1.339c-3.742,0.136 -7.364,2.724 -7,10c0.137,2.73 3.222,19.103 7.44,19c0.603,-0.015 1.229,-0.402 1.872,-1.176c1.017,-1.223 2.005,-2.332 2.708,-3.104c-0.315,-0.239 -0.619,-0.503 -0.906,-0.803zM37.023,14.731c0.015,0.154 0.002,0.286 -0.022,0.408c0.031,0.92 -0.068,1.813 -0.169,2.677c-0.074,0.636 -0.15,1.293 -0.171,1.952c-0.021,0.645 0.07,1.282 0.166,1.956c0.225,1.578 0.459,3.359 -0.765,5.437c0.225,0.296 0.423,0.571 0.581,0.837c4.61,-7.475 6.468,-16.361 4.695,-18.626c-2.683,-3.428 -6.397,-4.42 -9.339,-4.372c-0.921,0.015 -1.758,0.139 -2.473,0.294c5.076,2.46 7.337,7.732 7.497,9.437zM41,30.071c-2.665,0.55 -3.947,0.257 -4.569,-0.126c-0.1,0.072 -0.2,0.133 -0.293,0.19c-0.372,0.225 -0.961,0.583 -1.105,2.782c0.083,0.016 0.156,0.025 0.246,0.044l0.435,0.039c1.32,0.06 3.049,-0.31 4.063,-0.781c2.185,-1.014 3.376,-2.592 1.223,-2.148zM22.023,32.119c-0.037,-0.298 -0.198,-0.539 -0.492,-0.732l-0.108,-0.047c-0.361,-0.159 -0.77,-0.34 -1.423,-0.34h-0.004c-0.127,0.01 -0.253,0.019 -0.38,0.019c-0.052,0 -0.103,-0.007 -0.155,-0.009c-0.474,0.365 -1.148,0.647 -2.816,0.99c-2.98,0.759 -1.221,1.655 -0.078,1.794c1.106,0.277 3.735,0.614 5.481,-0.809c-0.005,-0.448 -0.013,-0.756 -0.025,-0.866zM20.681,18.501c-0.292,0.302 -0.753,0.566 -1.262,0.484c-0.828,-0.134 -1.463,-1.133 -1.417,-1.508v0c0.044,-0.374 0.751,-0.569 1.578,-0.435c0.287,0.047 0.548,0.128 0.768,0.228c-0.32,-0.688 -0.899,-1.085 -1.782,-1.182c-1.565,-0.174 -3.226,0.644 -3.56,1.097c0.007,0.11 0.02,0.251 0.033,0.417c0.093,1.147 0.265,3.284 -0.05,5.537c-0.208,1.485 0.393,3.169 1.567,4.395c0.757,0.79 1.641,1.29 2.513,1.438c0.111,-0.478 0.309,-0.944 0.513,-1.425c0.113,-0.265 0.233,-0.547 0.346,-0.852l0.162,-0.427c0.443,-1.155 0.9,-2.35 0.909,-4.703c0.004,-0.905 -0.107,-1.938 -0.318,-3.064zM34.847,22.007c-0.104,-0.729 -0.211,-1.484 -0.185,-2.303c0.023,-0.742 0.105,-1.442 0.184,-2.119c0.062,-0.533 0.11,-1.045 0.138,-1.55c-1.289,0.107 -2.145,0.479 -2.551,1.108c0.168,-0.057 0.358,-0.102 0.568,-0.129c0.892,-0.116 1.543,0.141 1.618,0.637c0.055,0.363 -0.253,0.705 -0.388,0.836c-0.277,0.269 -0.626,0.442 -0.981,0.488c-0.064,0.008 -0.129,0.012 -0.192,0.012c-0.353,0 -0.69,-0.121 -0.949,-0.3c0.112,1.973 1.567,4.612 2.283,5.907c0.153,0.277 0.271,0.498 0.369,0.688c0.393,-1.119 0.248,-2.139 0.086,-3.275z" fill="#0277bd"></path></g></g></svg>';
const cockroachIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1216 1216" preserveAspectRatio="none"><defs><linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#6A3BFF"/><stop offset="50%" stop-color="#2E6CFF"/><stop offset="100%" stop-color="#21E6D6"/></linearGradient></defs><path fill="url(#logoGradient)" d="M 602.142 194.554 C 602.924 194.946 605.532 195.734 605.934 195.47 C 611.2 192.006 618.7 187.368 623.854 184.227 C 660.266 162.342 699.354 145.255 740.147 133.392 C 803.3 114.439 874.321 105.199 940.302 110.373 C 951.886 111.244 963.442 112.453 974.955 113.997 C 985.529 115.504 1004.69 118.906 1014.82 118.489 L 1015.34 118.465 C 1013.38 139.181 1004.56 159.848 1003.11 176.387 C 930.665 163.406 861.372 163.08 789.939 180.33 C 779.674 182.808 768.846 186.442 758.643 188.418 L 757.774 188.582 C 750.444 192.26 730.953 197.566 721.874 201.364 C 702.142 209.62 674.841 221.148 656.683 232.361 C 664.44 239.704 673.844 246.602 681.162 253.467 C 701.644 272.679 737.141 307.193 751.353 330.113 C 791.477 379.813 824.792 450.59 842.159 512.165 C 844.728 521.273 849.507 536.977 850.424 546.08 C 859.572 586.983 863.707 625.487 863.107 667.426 C 862.945 678.787 863.291 691.969 862.083 703.154 C 862.647 719.546 853.81 770.027 849.875 787.15 C 817.771 930.808 730.03 1055.88 605.878 1134.97 C 596.127 1129.24 586.056 1121.61 576.866 1114.9 C 531.272 1081.93 491.003 1042.16 457.465 996.979 C 370.216 879.542 332.66 732.5 352.908 587.608 C 372.443 452.546 444.303 315.101 554.457 232.719 C 474.98 183.972 364.943 160.784 272.709 168.11 C 252.039 169.751 228.723 173.096 208.142 176.366 L 195.254 120.695 C 215.988 114.774 264.639 110.498 287.038 109.611 C 377.235 106.038 466.191 124.994 547.716 163.612 C 560.179 169.515 592.937 185.964 602.142 194.554 z M 600.783 626.64 L 605.246 629.503 C 607.954 629.191 645.058 595.063 649.818 590.225 C 689.504 549.896 731.492 509.82 732.783 449.492 C 734.3 378.617 676.423 329.517 628.967 285.108 C 621.884 278.502 613.487 273.217 606.841 266.25 L 606.014 265.374 C 592.722 276.144 579.919 287.501 566.462 298.021 C 556.961 308.516 548.237 316.693 538.294 326.581 C 532.779 332.066 525.931 341.879 520.478 348.025 C 492.154 379.952 477.076 411.751 478.285 455.347 C 479.976 516.377 531.141 563.393 572.369 602.637 C 580.636 610.505 592.787 618.27 600.783 626.64 z M 647.455 686.6 C 643.014 698.923 637.697 712.975 636.365 726.018 C 633.475 754.335 634.49 785.882 634.496 814.507 L 634.705 972.314 C 634.732 991.435 635.761 1024.51 633.001 1042.47 C 712.113 968.011 769.322 882.202 792.973 775.116 C 797.835 753.104 803.459 724.271 803.976 701.755 C 803.472 694.089 804.971 682.488 804.863 674.359 C 804.632 656.838 805.121 634.695 803.242 617.51 C 801.083 595.757 797.514 574.168 792.557 552.878 C 789.903 541.531 784.654 525.86 783.217 515.414 C 779.194 526.425 769.403 540.684 762.576 550.455 C 748.203 571.025 731.041 592.04 713.972 610.555 C 697.963 627.92 677.626 644.446 662.16 662.432 C 659.255 665.811 650.048 682.025 647.455 686.6 z M 566.649 1031.91 C 570.138 1035.15 573.657 1038.35 577.206 1041.52 C 575.705 1021.19 576.795 984.286 576.808 962.442 L 576.891 808.643 C 576.896 746.673 583.791 691.499 532.942 645.219 C 492.743 608.633 455.741 565.331 428.123 518.419 C 427.876 517.999 427.114 517.724 426.674 517.533 C 420.694 548.029 412.574 573.891 408.648 606.016 C 394.786 726.125 424.793 847.198 493.143 946.932 C 509.674 971.46 544.155 1012.82 566.649 1031.91 z"/></svg>';
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
