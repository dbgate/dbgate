const _ = require('lodash');
const fs = require('fs');
const stream = require('stream');
const { finished } = require('stream/promises');

const driverBases = require('../frontend/drivers');
const Analyser = require('./Analyser');
const wkx = require('wkx');
const pg = require('pg');
const pgCopyStreams = require('pg-copy-streams');
const QueryStream = require('pg-query-stream');
const { dumpPostgres, restoreSqlDump, PostgresVersionService, SqlDumpRestoreError } = require('dbgate-pg-dumper');
const sql = require('./sql');

const {
  getLogger,
  createBulkInsertStreamBase,
  makeUniqueColumnNames,
  extractDbNameFromComposite,
  extractErrorLogData,
  getConflictingColumnNames,
} = global.DBGATE_PACKAGES['dbgate-tools'];

let authProxy;

const logger = getLogger('postreDriver');

pg.types.setTypeParser(1082, 'text', val => val); // date
pg.types.setTypeParser(1114, 'text', val => val); // timestamp without timezone
pg.types.setTypeParser(1184, 'text', val => val); // timestamp
pg.types.setTypeParser(20, 'text', val => {
  const parsed = parseInt(val);
  if (Number.isSafeInteger(parsed)) return parsed;
  return { $bigint: val };
}); // timestamp
pg.types.setTypeParser(1700, 'text', val => {
  return { $decimal: val };
}); // numeric

function extractGeographyDate(value) {
  try {
    const buffer = Buffer.from(value, 'hex');
    const parsed = wkx.Geometry.parse(buffer).toWkt();

    return parsed;
  } catch (_err) {
    return value;
  }
}

function transformRow(row, columnsToTransform) {
  if (!columnsToTransform?.length) return row;

  for (const col of columnsToTransform) {
    const { columnName, dataTypeName } = col;
    if (dataTypeName == 'geography') {
      row[columnName] = extractGeographyDate(row[columnName]);
    } else if (dataTypeName == 'bytea' && row[columnName]) {
      row[columnName] = { $binary: { base64: Buffer.from(row[columnName]).toString('base64') } };
    }
  }

  return row;
}

function extractPostgresColumns(result, dbhan) {
  if (!result || !result.fields) return [];

  const { typeIdToName = {} } = dbhan;
  const res = result.fields.map(fld => ({
    columnName: fld.name,
    dataTypeId: fld.dataTypeID,
    dataTypeName: typeIdToName[fld.dataTypeID],
    tableId: fld.tableID,
    columnId: fld.columnID,
  }));

  // const conflictingNames = getConflictingColumnNames(res);
  // if (conflictingNames.size > 0) {
  //   const requiredTableIds = res.filter(x => conflictingNames.has(x.columnName)).map(x => x.tableId);
  //   const tableIdResult = await dbhan.client.query(
  //     `SELECT DISTINCT c.oid AS table_id, c.relname AS table_name
  //      FROM pg_class c
  //      WHERE c.oid IN (${requiredTableIds.join(',')})`
  //   );
  //   const tableIdToTableName = _.fromPairs(tableIdResult.rows.map(cur => [cur.table_id, cur.table_name]));
  //   for (const col of res) {
  //     col.pureName = tableIdToTableName[col.tableId];
  //   }
  // }

  makeUniqueColumnNames(res);
  return res;
}

function zipDataRow(rowArray, columns) {
  return _.zipObject(
    columns.map(x => x.columnName),
    rowArray
  );
}

function findDbInfoTable(dbinfo, schemaName, pureName) {
  if (!dbinfo?.tables) return null;
  if (schemaName) {
    return dbinfo.tables.find(table => table.schemaName == schemaName && table.pureName == pureName);
  }
  const tables = dbinfo.tables.filter(table => table.pureName == pureName);
  return tables.length == 1 ? tables[0] : null;
}

function isPrimaryKeyColumn(dbinfo, schemaName, tableName, columnName) {
  const table = findDbInfoTable(dbinfo, schemaName, tableName);
  return !!table?.primaryKey?.columns?.some(column => column.columnName == columnName);
}

function getAnalyserColumnMetadata(dbinfo) {
  const res = {};
  for (const table of dbinfo?.tables || []) {
    for (const column of table.columns || []) {
      if (column.postgresTableId && column.postgresColumnId) {
        res[`${column.postgresTableId}.${column.postgresColumnId}`] = {
          tableSchema: table.schemaName,
          tableName: table.pureName,
          columnName: column.columnName,
        };
      }
    }
  }
  return res;
}

function updateDumpTransactionStatus(state, sqlText) {
  let statement = sqlText.trimStart();
  while (statement.startsWith('--') || statement.startsWith('/*')) {
    if (statement.startsWith('--')) {
      const lineEnd = statement.search(/[\r\n]/);
      statement = lineEnd >= 0 ? statement.substring(lineEnd + 1).trimStart() : '';
    } else {
      const commentEnd = statement.indexOf('*/');
      statement = commentEnd >= 0 ? statement.substring(commentEnd + 2).trimStart() : '';
    }
  }
  const tokens = statement.split(/\s+/);
  const command = tokens[0]?.toUpperCase();
  if (
    command == 'BEGIN' ||
    command == 'START' ||
    command == 'SAVEPOINT' ||
    command == 'RELEASE' ||
    (command == 'ROLLBACK' && tokens[1]?.toUpperCase() == 'TO')
  ) {
    state.status = 'in-transaction';
  } else if (command == 'COMMIT' || command == 'ROLLBACK') {
    state.status = 'idle';
  }
}

function createPgDumperConnection(client) {
  const transactionState = { status: 'idle' };
  let activeCopy = null;

  return {
    async query(request, signal) {
      signal?.throwIfAborted();
      try {
        const result = await new Promise((resolve, reject) => {
          const query = new pg.Query(
            {
              text: request.text,
              ...(request.values ? { values: [...request.values] } : {}),
              ...(request.name ? { name: request.name } : {}),
            },
            (error, queryResult) => {
              signal?.removeEventListener('abort', abort);
              if (error) {
                reject(error);
              } else {
                resolve(queryResult);
              }
            }
          );
          const abort = () => {
            client.cancel(client, query);
            reject(new Error('PostgreSQL operation was cancelled'));
          };
          signal?.addEventListener('abort', abort, { once: true });
          client.query(query);
        });
        updateDumpTransactionStatus(transactionState, request.text);
        return {
          rows: result.rows,
          rowCount: result.rowCount ?? result.rows.length,
        };
      } catch (error) {
        if (transactionState.status == 'in-transaction') {
          transactionState.status = 'failed';
        }
        throw error;
      }
    },
    async *stream(request, options = {}) {
      options.signal?.throwIfAborted();
      const query = new QueryStream(request.text, request.values ? [...request.values] : [], {
        ...(options.batchSize ? { batchSize: options.batchSize } : {}),
      });
      const abort = () => query.destroy(new Error('PostgreSQL operation was cancelled'));
      options.signal?.addEventListener('abort', abort, { once: true });
      client.query(query);

      try {
        for await (const row of query) {
          options.signal?.throwIfAborted();
          yield row;
        }
      } finally {
        options.signal?.removeEventListener('abort', abort);
      }
    },
    async getTransactionStatus(signal) {
      signal?.throwIfAborted();
      return transactionState.status;
    },
    async openCopyFrom(request) {
      request.signal?.throwIfAborted();
      if (activeCopy) {
        throw new Error('DBGM-00439 A PostgreSQL COPY operation is already active');
      }

      const writable = client.query(pgCopyStreams.from(request.query));
      let settled = false;
      let resolveCompletion;
      let rejectCompletion;
      const completion = new Promise((resolve, reject) => {
        resolveCompletion = resolve;
        rejectCompletion = reject;
      });
      let operation;

      const cleanup = () => {
        request.signal?.removeEventListener('abort', handleSignalAbort);
        writable.removeListener('finish', handleFinish);
        writable.removeListener('error', handleError);
        writable.removeListener('close', handleClose);
        if (activeCopy == operation) {
          activeCopy = null;
        }
      };
      const rejectCopy = error => {
        if (settled) return;
        settled = true;
        if (transactionState.status == 'in-transaction') {
          transactionState.status = 'failed';
        }
        cleanup();
        rejectCompletion(error);
      };
      const handleFinish = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolveCompletion({ rowCount: writable.rowCount });
      };
      const handleError = error => rejectCopy(error);
      const handleClose = () => {
        if (!settled) {
          rejectCopy(new Error('DBGM-00440 PostgreSQL COPY stream closed before completion'));
        }
      };
      const handleSignalAbort = () => operation.abort();

      operation = {
        writable,
        completion,
        async abort(reason = new Error('PostgreSQL COPY operation was cancelled')) {
          if (!settled) {
            writable.destroy(reason);
            await completion.catch(() => {});
          }
        },
      };

      writable.once('finish', handleFinish);
      writable.once('error', handleError);
      writable.once('close', handleClose);
      request.signal?.addEventListener('abort', handleSignalAbort, { once: true });
      activeCopy = operation;
      return operation;
    },
    async cancel() {
      await activeCopy?.abort();
    },
  };
}

function getSqlRestoreProgressMessage(progress) {
  switch (progress.phase) {
    case 'started':
      return 'PostgreSQL SQL dump restore started';
    case 'statement-completed':
      return `Restored SQL statement ${progress.statementsCompleted}`;
    case 'copy-started':
      return `Restoring table data for ${progress.objectIdentity}`;
    case 'copy-progress':
      return `Restored ${progress.rowsRestored.toLocaleString('en-US')} rows`;
    case 'copy-completed':
      return `Finished restoring table ${progress.objectIdentity}. Restored ${progress.rowsRestored.toLocaleString(
        'en-US'
      )} rows in total`;
    case 'completed':
      if (progress.operationsFailed > 0) return null;
      return `PostgreSQL SQL dump restore completed (${progress.operationsCompleted} operations)`;
    default:
      return null;
  }
}

function formatSqlRestoreError(error) {
  if (!(error instanceof SqlDumpRestoreError)) return null;

  const serverMessage = error.fields?.serverMessage;
  const unsupportedSetting = serverMessage?.match(/^unrecognized configuration parameter\s+(.+)$/i);
  const summary = unsupportedSetting
    ? `The target PostgreSQL version does not support the dump setting ${unsupportedSetting[1]}.`
    : error.message;
  const details = [
    summary,
    unsupportedSetting ? null : serverMessage && `PostgreSQL: ${serverMessage}`,
    error.fields?.detail && `Detail: ${error.fields.detail}`,
    error.fields?.hint && `Hint: ${error.fields.hint}`,
    error.sqlPreview && `SQL: ${error.sqlPreview}`,
    `Dump location: line ${error.line}, column ${error.column}.`,
  ].filter(Boolean);

  return `DBGM-00441 ${details.join(' ')}`;
}

/** @type {import('dbgate-types').EngineDriver} */
const drivers = driverBases.map(driverBase => ({
  ...driverBase,
  analyserClass: Analyser,

  async backupDatabase(connection, settings, runner) {
    if (!driverBase.supportsNodejsBackup) {
      throw new Error('DBGM-00442 dbgate-pg-dumper is available only for PostgreSQL connections');
    }

    const { outputFile, database, selectedTables = [], skippedTables = [], options = {} } = settings;
    if (options.dataOnly && options.schemaOnly) {
      throw new Error('DBGM-00443 Data-only and schema-only backup options cannot be enabled together');
    }

    const dbhan = await this.connect({ ...connection, database });
    const output = fs.createWriteStream(outputFile);

    try {
      let targetVersion;
      if (options.targetPostgresVersion && options.targetPostgresVersion != 'source') {
        const normalizedVersion = String(options.targetPostgresVersion);
        const versionNumber = normalizedVersion == '9.6' ? 90600 : Number.parseInt(normalizedVersion, 10) * 10000;
        targetVersion = new PostgresVersionService().parse(versionNumber, normalizedVersion);
      }

      const result = await dumpPostgres(
        createPgDumperConnection(dbhan.client),
        {
          mode: options.dataOnly ? 'data-only' : options.schemaOnly ? 'schema-only' : 'full',
          dataFormat: options.insert ? 'insert' : 'copy',
          ...(targetVersion ? { targetVersion } : {}),
          noPrivileges: !!options.noPrivileges,
          noOwner: !!options.noOwner,
          ...(skippedTables.length > 0
            ? {
                selection: {
                  includeTables: selectedTables.map(table => `${table.schemaName}.${table.pureName}`),
                  excludeTables: skippedTables.map(table => `${table.schemaName}.${table.pureName}`),
                },
              }
            : {}),
        },
        output,
        progress => runner.info({ message: progress.message, severity: 'info' }),
        runner.signal
      );

      output.end();
      await finished(output);

      for (const warning of result.warnings) {
        runner.info({
          message: warning.message,
          severity: warning.severity == 'warning' ? 'warning' : 'info',
        });
      }
      runner.info({
        message: `Wrote ${result.objectsWritten} objects and ${result.rowsWritten} rows`,
        severity: 'info',
      });
    } catch (error) {
      output.destroy();
      throw error;
    } finally {
      await this.close(dbhan);
    }
  },

  async restoreDatabase(connection, settings, runner) {
    if (!driverBase.supportsNodejsRestore) {
      throw new Error('DBGM-00444 dbgate-pg-dumper is available only for PostgreSQL connections');
    }

    const { inputFile, database, options = {} } = settings;
    const dbhan = await this.connect({ ...connection, database });
    const input = fs.createReadStream(inputFile, { highWaterMark: 64 * 1024 });
    const reportedErrors = new Set();

    try {
      const result = await restoreSqlDump({
        source: input,
        connection: createPgDumperConnection(dbhan.client),
        signal: runner.signal,
        options: {
          progressThrottleMilliseconds: 1000,
          stopOnError: options.stopOnError ?? true,
        },
        progress: progress => {
          if (progress.error) {
            runner.info({ message: formatSqlRestoreError(progress.error), severity: 'error' });
            reportedErrors.add(progress.error);
            return;
          }
          const message = getSqlRestoreProgressMessage(progress);
          if (message) {
            runner.info({ message, severity: 'info' });
          }
        },
      });
      if (result.errors.length > 0) {
        for (const error of result.errors) {
          if (!reportedErrors.has(error)) {
            runner.info({ message: formatSqlRestoreError(error), severity: 'error' });
          }
        }
        const errorCount = result.errors.length;
        throw new Error(
          `DBGM-00441 PostgreSQL restore completed with ${errorCount} error${errorCount == 1 ? '' : 's'}`
        );
      }
      runner.info({
        message: `Restored ${result.statementsCompleted} SQL statements, ${result.copyBlocksCompleted} COPY blocks and ${result.rowsRestored} rows`,
        severity: 'info',
      });
    } catch (error) {
      if (reportedErrors.has(error)) {
        const errorCount = reportedErrors.size;
        throw new Error(
          `DBGM-00441 PostgreSQL restore stopped after ${errorCount} error${errorCount == 1 ? '' : 's'}`,
          { cause: error }
        );
      }
      const formattedError = formatSqlRestoreError(error);
      if (formattedError) {
        throw new Error(formattedError, { cause: error });
      }
      throw error;
    } finally {
      input.destroy();
      await this.close(dbhan);
    }
  },

  async connect(props) {
    const {
      conid,
      engine,
      server,
      port,
      user,
      password,
      database,
      databaseUrl,
      useDatabaseUrl,
      ssl,
      isReadOnly,
      authType,
      socketPath,
      defaultIsolationLevel,
    } = props;
    let options = null;

    let awsIamToken = null;
    if (authType == 'awsIam') {
      awsIamToken = await authProxy.getAwsIamToken(props);
    }

    if (engine == 'redshift@dbgate-plugin-postgres') {
      let url = databaseUrl;
      if (url && url.startsWith('jdbc:redshift://')) {
        url = url.substring('jdbc:redshift://'.length);
      }
      if (user && password) {
        url = `postgres://${user}:${password}@${url}`;
      } else if (user) {
        url = `postgres://${user}@${url}`;
      } else {
        url = `postgres://${url}`;
      }

      options = {
        connectionString: url,
      };
    } else {
      options = useDatabaseUrl
        ? {
            connectionString: databaseUrl,
            application_name: 'DbGate',
          }
        : {
            host: authType == 'socket' ? socketPath || driverBase.defaultSocketPath : server,
            port: authType == 'socket' ? null : port,
            user,
            password: awsIamToken || password,
            database: extractDbNameFromComposite(database) || 'postgres',
            ssl: authType == 'awsIam' ? ssl || { rejectUnauthorized: false } : ssl,
            application_name: 'DbGate',
          };
    }

    const client = new pg.Client(options);
    await client.connect();

    const dbhan = {
      client,
      database,
      conid,
    };

    const datatypes = await this.query(
      dbhan,
      `SELECT oid, typname FROM pg_type WHERE typname in ('geography', 'bytea')`
    );
    const typeIdToName = _.fromPairs(datatypes.rows.map(cur => [cur.oid, cur.typname]));
    dbhan['typeIdToName'] = typeIdToName;

    if (isReadOnly) {
      await this.query(dbhan, 'SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY');
    }
    if (defaultIsolationLevel) {
      await this.setTransactionIsolationLevel(dbhan, defaultIsolationLevel);
    }

    return dbhan;
  },
  async close(dbhan) {
    return dbhan.client.end();
  },
  async query(dbhan, sql, options) {
    if (sql == null) {
      return {
        rows: [],
        columns: [],
      };
    }
    const commandTimeout = options?.commandTimeout;
    if (commandTimeout) {
      await dbhan.client.query({ text: `SET statement_timeout = ${parseInt(commandTimeout)}` });
    }
    let res;
    try {
      res = await dbhan.client.query({ text: sql, rowMode: 'array' });
    } finally {
      if (commandTimeout) {
        await dbhan.client.query({ text: 'SET statement_timeout = 0' }).catch(() => {});
      }
    }
    const columns = extractPostgresColumns(res, dbhan);

    const transormableTypeNames = Object.values(dbhan.typeIdToName ?? {});
    const columnsToTransform = columns.filter(x => transormableTypeNames.includes(x.dataTypeName));

    const zippedRows = (res.rows || []).map(row => zipDataRow(row, columns));
    const transformedRows = zippedRows.map(row => transformRow(row, columnsToTransform));

    return { rows: transformedRows, columns };
  },
  async enrichColumnMetadata(dbhan, sql, columns, dbinfo) {
    const metadataByKey = getAnalyserColumnMetadata(dbinfo);
    if (_.isEmpty(metadataByKey)) return columns;

    const enriched = columns.map(column => {
      const metadataRow = metadataByKey[`${column.tableId}.${column.columnId}`];
      if (!metadataRow) return column;
      return {
        ...column,
        tableName: column.tableName || metadataRow.tableName,
        tableSchema: column.tableSchema || metadataRow.tableSchema,
        sourceColumnName: column.sourceColumnName || metadataRow.columnName,
        isPrimaryKey:
          column.isPrimaryKey ||
          isPrimaryKeyColumn(dbinfo, metadataRow.tableSchema, metadataRow.tableName, metadataRow.columnName),
      };
    });
    return enriched.some(column => column.tableName && column.sourceColumnName) ? enriched : columns;
  },
  stream(dbhan, sql, options) {
    const handleNotice = notice => {
      const { message, where } = notice;
      options.info({
        message,
        procedure: where,
        time: new Date(),
        severity: 'info',
        detail: notice,
      });
    };

    const query = new pg.Query({
      text: sql,
      rowMode: 'array',
    });

    let wasHeader = false;
    let columnsToTransform = null;
    dbhan.client.on('notice', handleNotice);

    query.on('row', row => {
      if (!wasHeader) {
        columns = extractPostgresColumns(query._result, dbhan);
        if (columns && columns.length > 0) {
          options.recordset(columns, { engine: driverBase.engine });
        }
        wasHeader = true;
      }

      if (!columnsToTransform) {
        const transormableTypeNames = Object.values(dbhan.typeIdToName ?? {});
        columnsToTransform = columns.filter(x => transormableTypeNames.includes(x.dataTypeName));
      }

      const zippedRow = zipDataRow(row, columns);
      const transformedRow = transformRow(zippedRow, columnsToTransform);

      options.row(transformedRow);
    });

    query.on('end', () => {
      const { command, rowCount } = query._result || {};

      if (command != 'SELECT' && _.isNumber(rowCount)) {
        options.info({
          message: `${rowCount} rows affected`,
          time: new Date(),
          severity: 'info',
          rowsAffected: rowCount,
        });
      }

      if (!wasHeader) {
        columns = extractPostgresColumns(query._result, dbhan);
        if (columns && columns.length > 0) {
          options.recordset(columns);
        }
        wasHeader = true;
      }

      dbhan.client.off('notice', handleNotice);
      options.done();
    });

    query.on('error', error => {
      logger.error(extractErrorLogData(error, this.getLogDbInfo(dbhan)), 'DBGM-00201 Stream error');
      const { message, position, procName } = error;
      let line = null;
      if (position) {
        line = sql.substring(0, parseInt(position)).replace(/[^\n]/g, '').length;
      }
      options.info({
        message,
        line,
        procedure: procName,
        time: new Date(),
        severity: 'error',
      });
      dbhan.client.off('notice', handleNotice);
      options.done();
    });

    dbhan.client.query(query);
  },
  async getVersion(dbhan) {
    const { rows } = await this.query(dbhan, 'SELECT version()');
    const { version } = rows[0];

    let isFipsComplianceOn = false;
    try {
      await this.query(dbhan, "SELECT MD5('test')");
    } catch (err) {
      isFipsComplianceOn = true;
    }

    const isCockroach = version.toLowerCase().includes('cockroachdb');
    const isRedshift = version.toLowerCase().includes('redshift');
    const isPostgres = !isCockroach && !isRedshift;

    const m = version.match(/([\d\.]+)/);
    let versionText = null;
    let versionMajor = null;
    let versionMinor = null;
    if (m) {
      if (isCockroach) versionText = `CockroachDB ${m[1]}`;
      if (isRedshift) versionText = `Redshift ${m[1]}`;
      if (isPostgres) versionText = `PostgreSQL ${m[1]}`;
      const numbers = m[1].split('.');
      if (numbers[0]) versionMajor = parseInt(numbers[0]);
      if (numbers[1]) versionMinor = parseInt(numbers[1]);
    }

    return {
      version,
      versionText,
      isPostgres,
      isCockroach,
      isRedshift,
      versionMajor,
      versionMinor,
      isFipsComplianceOn,
    };
  },
  async readQuery(dbhan, sql, structure) {
    const query = new pg.Query({
      text: sql,
      rowMode: 'array',
    });

    let wasHeader = false;
    let columns = null;

    let columnsToTransform = null;

    const pass = new stream.PassThrough({
      objectMode: true,
      highWaterMark: 100,
    });

    query.on('row', row => {
      if (!wasHeader) {
        columns = extractPostgresColumns(query._result, dbhan);
        pass.write({
          __isStreamHeader: true,
          engine: driverBase.engine,
          ...(structure || { columns }),
        });
        wasHeader = true;
      }

      if (!columnsToTransform) {
        const transormableTypeNames = Object.values(dbhan.typeIdToName ?? {});
        columnsToTransform = columns.filter(x => transormableTypeNames.includes(x.dataTypeName));
      }

      const zippedRow = zipDataRow(row, columns);
      const transformedRow = transformRow(zippedRow, columnsToTransform);

      pass.write(transformedRow);
    });

    query.on('end', () => {
      if (!wasHeader) {
        columns = extractPostgresColumns(query._result, dbhan);
        pass.write({
          __isStreamHeader: true,
          ...(structure || { columns }),
        });
        wasHeader = true;
      }

      pass.end();
    });

    query.on('error', error => {
      console.error(error);
      pass.end();
    });

    dbhan.client.query(query);

    return pass;
  },
  async writeTable(dbhan, name, options) {
    // @ts-ignore
    return createBulkInsertStreamBase(this, stream, dbhan, name, options);
  },

  async serverSummary(dbhan) {
    const [processes, variables, databases] = await Promise.all([
      this.listProcesses(dbhan),
      this.listVariables(dbhan),
      this.listDatabasesFull(dbhan),
    ]);

    /** @type {import('dbgate-types').ServerSummary} */
    const data = {
      processes,
      variables,
      databases: {
        rows: databases,
        columns: [
          { header: 'Name', fieldName: 'name', type: 'data' },
          { header: 'Size on disk', fieldName: 'sizeOnDisk', type: 'fileSize' },
        ],
      },
    };

    return data;
  },

  async killProcess(dbhan, pid) {
    const result = await this.query(dbhan, `SELECT pg_terminate_backend(${parseInt(pid)})`);
    return result;
  },

  async setTransactionIsolationLevel(dbhan, level) {
    if (this.isolationLevels && level && !this.isolationLevels.includes(level)) {
      throw new Error(
        `Isolation level "${level}" is not supported. Supported levels: ${this.isolationLevels.join(', ')}`
      );
    }
    await this.query(dbhan, `SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL ${level}`);
  },

  async listDatabasesFull(dbhan) {
    const { rows } = await this.query(dbhan, sql.listDatabases);
    return rows;
  },

  async listDatabases(dbhan) {
    const { rows } = await this.query(dbhan, 'SELECT datname AS name FROM pg_database WHERE datistemplate = false');
    return rows;
  },

  async listVariables(dbhan) {
    const result = await this.query(dbhan, sql.listVariables);
    return result.rows.map(row => ({
      variable: row.variable,
      value: row.value,
    }));
  },

  async listProcesses(dbhan) {
    const result = await this.query(dbhan, sql.listProcesses);
    return result.rows.map(row => ({
      processId: row.processId,
      connectionId: row.connectionId,
      client: row.client,
      operation: row.operation,
      namespace: null,
      command: row.operation,
      runningTime: row.runningTime ? Math.max(Number(row.runningTime), 0) : null,
      state: row.state,
      waitingFor: row.waitingFor,
      locks: null,
      progress: null,
    }));
  },

  getAuthTypes() {
    const res = [
      {
        title: 'Host and port',
        name: 'hostPort',
      },
      {
        title: 'Socket',
        name: 'socket',
      },
    ];
    if (authProxy.supportsAwsIam()) {
      res.push({
        title: 'AWS IAM',
        name: 'awsIam',
      });
    }
    return res;
  },

  async listSchemas(dbhan) {
    const schemaRows = await this.query(
      dbhan,
      'select oid as "object_id", nspname as "schema_name" from pg_catalog.pg_namespace'
    );
    const defaultSchemaRows = await this.query(dbhan, 'SELECT current_schema');
    const defaultSchema = defaultSchemaRows.rows[0]?.current_schema?.trim();

    logger.debug(this.getLogDbInfo(dbhan), `DBGM-00142 Loaded ${schemaRows.rows.length} postgres schemas`);

    const schemas = schemaRows.rows.map(x => ({
      schemaName: x.schema_name,
      objectId: x.object_id,
      isDefault: x.schema_name == defaultSchema,
    }));

    return schemas;
  },

  writeQueryFromStream(dbhan, sql) {
    const stream = dbhan.client.query(pgCopyStreams.from(sql));
    return stream;
  },
}));

drivers.initialize = dbgateEnv => {
  authProxy = dbgateEnv.authProxy;
};

module.exports = drivers;
