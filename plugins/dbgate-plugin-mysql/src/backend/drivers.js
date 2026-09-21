const _ = require('lodash');
const stream = require('stream');
const driverBases = require('../frontend/drivers');
const Analyser = require('./Analyser');
const mysql2 = require('mysql2');
const fs = require('fs');
const { finished } = require('stream/promises');
const { dumpMysql, restoreSqlDump } = require('dbgate-mysql-dumper');
const { fromMysql2Connection } = require('dbgate-mysql-dumper/mysql2');
const {
  createDumpProgressReporter,
  createRestoreProgressReporter,
  formatMysqlRestoreError,
  formatRestoreStatementError,
  getMysqlDumpOptions,
} = require('./mysqlDumperSupport');
const { getLogger, createBulkInsertStreamBase, makeUniqueColumnNames, extractErrorLogData } =
  global.DBGATE_PACKAGES['dbgate-tools'];

const logger = getLogger('mysqlDriver');
const MYSQL_PRI_KEY_FLAG = 2;

let authProxy;

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

function extractColumns(fields) {
  if (fields) {
    const res = fields.map(col => ({
      columnName: col.name,
      pureName: col.orgTable,
      tableName: col.orgTable || undefined,
      tableSchema: col.db || undefined,
      sourceColumnName: col.orgName || undefined,
      isPrimaryKey: !!(col.flags & MYSQL_PRI_KEY_FLAG),
    }));
    makeUniqueColumnNames(res);
    return res;
  }
  return null;
}

async function enrichColumnMetadata(columns, dbinfo) {
  return columns.map(column => ({
    ...column,
    isPrimaryKey:
      column.isPrimaryKey || isPrimaryKeyColumn(dbinfo, column.tableSchema, column.tableName, column.sourceColumnName),
  }));
}

function modifyRow(row, columns) {
  columns.forEach(col => {
    if (Buffer.isBuffer(row[col.columnName])) {
      row[col.columnName] = { $binary: { base64: Buffer.from(row[col.columnName]).toString('base64') } };
    }
  });
  return row;
}

function zipDataRow(rowArray, columns) {
  return _.zipObject(
    columns.map(x => x.columnName),
    rowArray
  );
}

/** @type {import('dbgate-types').EngineDriver} */
const drivers = driverBases.map(driverBase => ({
  ...driverBase,
  analyserClass: Analyser,

  async backupDatabase(connection, settings, runner) {
    if (!driverBase.supportsNodejsBackup) {
      throw new Error('DBGM-00000 dbgate-mysql-dumper is not available for this connection');
    }
    const { outputFile, database, selectedTables = [], skippedTables = [], options = {} } = settings;
    const dumpOptions = getMysqlDumpOptions(database, selectedTables, skippedTables, options);
    let dbhan = null;
    let output = null;
    let dumperConnection = null;

    try {
      dbhan = await this.connect({ ...connection, database, forceRowsAsObjects: true });
      dumperConnection = fromMysql2Connection(dbhan.client);
      output = fs.createWriteStream(outputFile);
      const result = await dumpMysql(
        dumperConnection,
        dumpOptions,
        output,
        createDumpProgressReporter(runner, driverBase.title),
        runner.signal
      );
      if (result.cancelled) {
        throw new Error(`DBGM-00000 ${driverBase.title} backup cancelled`);
      }
      output.end();
      await finished(output);
      for (const warning of result.warnings) {
        runner.info({ message: warning.message, severity: warning.severity });
      }
      runner.info({
        message: `Wrote ${result.renderedDumpIds.length} objects, ${result.rowsExported.toLocaleString(
          'en-US'
        )} rows and ${result.bytesWritten.toLocaleString('en-US')} bytes`,
        severity: 'info',
      });
    } catch (error) {
      output?.destroy();
      // A cancelled or failed dump leaves a truncated file behind, which would show up in the SQL
      // folder looking like a complete backup.
      await fs.promises.rm(outputFile, { force: true }).catch(() => {});
      throw error;
    } finally {
      if (dbhan && !dumperConnection?.isDestroyed) await this.close(dbhan);
    }
  },

  async restoreDatabase(connection, settings, runner) {
    if (!driverBase.supportsNodejsRestore) {
      throw new Error('DBGM-00000 dbgate-mysql-dumper is not available for this connection');
    }
    const { inputFile, database, options = {} } = settings;
    let dbhan = null;
    let input = null;
    let dumperConnection = null;

    try {
      dbhan = await this.connect({ ...connection, database, forceRowsAsObjects: true });
      dumperConnection = fromMysql2Connection(dbhan.client);
      input = fs.createReadStream(inputFile, { highWaterMark: 64 * 1024 });
      const stopOnError = options.stopOnError ?? true;
      const progress = createRestoreProgressReporter(runner, driverBase.title);
      const result = await restoreSqlDump({
        connection: dumperConnection,
        source: input,
        signal: runner.signal,
        options: {
          databaseName: database,
          stopOnError,
        },
        progress,
      });
      // Reported before the error branch below, because a failed restore is exactly when warnings
      // like definer-rewritten or an unrestored session state matter most.
      for (const warning of result.warnings) {
        runner.info({ message: warning.message, severity: 'warning' });
      }
      if (result.cancelled) {
        throw new Error(`DBGM-00000 ${driverBase.title} restore cancelled`);
      }
      if (result.errors.length > 0) {
        for (const error of result.errors) {
          if (progress.reportedStatementIndexes.has(error.statementIndex)) continue;
          runner.info({ message: formatRestoreStatementError(error, driverBase.title), severity: 'error' });
        }
        const count = result.errors.length;
        throw new Error(
          `DBGM-00000 ${driverBase.title} restore ${stopOnError ? 'stopped at' : 'finished with'} ${count} error${
            count == 1 ? '' : 's'
          }: ${formatRestoreStatementError(result.errors[0], driverBase.title)}`
        );
      }
      runner.info({
        message: `Restored ${result.statementsExecuted} SQL statements and ${result.rowsRestored.toLocaleString(
          'en-US'
        )} rows (${result.bytesConsumed.toLocaleString('en-US')} bytes read)`,
        severity: 'info',
      });
    } catch (error) {
      const formatted = formatMysqlRestoreError(error);
      if (formatted) throw new Error(formatted, { cause: error });
      throw error;
    } finally {
      input?.destroy();
      if (dbhan && !dumperConnection?.isDestroyed) await this.close(dbhan);
    }
  },

  async connect(props) {
    const { conid, server, port, user, password, database, ssl, isReadOnly, forceRowsAsObjects, socketPath, authType } =
      props;
    let awsIamToken = null;
    if (authType == 'awsIam') {
      awsIamToken = await authProxy.getAwsIamToken(props);
    }

    const options = {
      host: authType == 'socket' ? null : server,
      port: authType == 'socket' ? null : port,
      socketPath: authType == 'socket' ? socketPath || driverBase.defaultSocketPath : null,
      user,
      password: awsIamToken || password,
      database,
      ssl: authType == 'awsIam' ? ssl || { rejectUnauthorized: false } : ssl,
      rowsAsArray: forceRowsAsObjects ? false : true,
      supportBigNumbers: true,
      bigNumberStrings: true,
      dateStrings: true,
      infileStreamFactory: path => fs.createReadStream(path),
      // TODO: test following options
      // multipleStatements: true,
    };

    const client = mysql2.createConnection(options);
    const dbhan = {
      client,
      database,
      conid,
    };
    if (isReadOnly) {
      await this.query(dbhan, 'SET SESSION TRANSACTION READ ONLY');
    }
    if (props.defaultIsolationLevel) {
      await this.setTransactionIsolationLevel(dbhan, props.defaultIsolationLevel);
    }
    return dbhan;
  },
  close(dbhan) {
    return new Promise(resolve => {
      // A connection that already died - a failed handshake sets _closing and _fatalError - never
      // gets its end() callback invoked by mysql2, so awaiting end() there would hang forever.
      // Backup and restore await close() in a finally block, which turns any connection-level
      // failure into an operation that never finishes.
      if (dbhan.client._closing || dbhan.client._fatalError) {
        dbhan.client.destroy();
        resolve();
        return;
      }
      dbhan.client.end(resolve);
    });
  },
  enrichColumnMetadata(dbhan, sql, columns, dbinfo) {
    return enrichColumnMetadata(columns, dbinfo);
  },
  query(dbhan, sql, options) {
    if (sql == null) {
      return {
        rows: [],
        columns: [],
      };
    }

    if (
      options?.importSqlDump &&
      (sql.trim().startsWith('/*!') || sql.trim().startsWith('/*M!')) &&
      (sql.includes('character_set_client') || sql.includes('NOTE_VERBOSITY'))
    ) {
      // skip this in SQL dumps
      return {
        rows: [],
        columns: [],
      };
    }

    const commandTimeout = options?.commandTimeout;
    const queryOptions = {};
    if (commandTimeout) {
      queryOptions.timeout = parseInt(commandTimeout);
    }

    return new Promise((resolve, reject) => {
      dbhan.client.query({ sql, ...queryOptions }, function (error, results, fields) {
        if (error) {
          reject(error);
          return;
        }
        const columns = extractColumns(fields);
        resolve({
          rows: results && columns && results.map && results.map(row => modifyRow(zipDataRow(row, columns), columns)),
          columns,
        });
      });
    });
  },
  async stream(dbhan, sql, options) {
    const query = dbhan.client.query(sql);
    let columns = [];

    // const handleInfo = (info) => {
    //   const { message, lineNumber, procName } = info;
    //   options.info({
    //     message,
    //     line: lineNumber,
    //     procedure: procName,
    //     time: new Date(),
    //     severity: 'info',
    //   });
    // };

    const handleEnd = () => {
      options.done();
    };

    const handleRow = row => {
      if (row && row.constructor && (row.constructor.name == 'OkPacket' || row.constructor.name == 'ResultSetHeader')) {
        options.info({
          message: `${row.affectedRows} rows affected`,
          time: new Date(),
          severity: 'info',
          rowsAffected: row.affectedRows,
        });
        if (row.stateChanges?.schema) {
          options.changedCurrentDatabase(row.stateChanges.schema);
        }
      } else {
        if (columns) {
          options.row(modifyRow(zipDataRow(row, columns), columns));
        }
      }
    };

    const handleFields = fields => {
      columns = extractColumns(fields);
      if (columns) options.recordset(columns, { engine: driverBase.engine });
    };

    const handleError = error => {
      logger.error(extractErrorLogData(error, this.getLogDbInfo(dbhan)), 'DBGM-00200 Stream error');
      const { message } = error;
      options.info({
        message,
        line: 0,
        time: new Date(),
        severity: 'error',
      });
    };

    query.on('error', handleError).on('fields', handleFields).on('result', handleRow).on('end', handleEnd);
  },
  async readQuery(dbhan, sql, structure) {
    const query = dbhan.client.query(sql);

    const pass = new stream.PassThrough({
      objectMode: true,
      highWaterMark: 100,
    });
    pass.on('error', () => {});

    let columns = [];
    let isPaused = false;
    let isClosed = false;
    const resumeQuery = () => {
      if (isPaused) {
        isPaused = false;
        dbhan.client.resume();
      }
    };

    query
      .on('error', err => {
        logger.error(extractErrorLogData(err, this.getLogDbInfo(dbhan)), 'DBGM-00438 Query reader stream error');
        isClosed = true;
        resumeQuery();
        pass.destroy(err);
      })
      .on('fields', fields => {
        columns = extractColumns(fields);
        pass.write({
          __isStreamHeader: true,
          engine: driverBase.engine,
          ...(structure || { columns }),
        });
      })
      .on('result', row => {
        if (isClosed) return;
        if (!pass.write(modifyRow(zipDataRow(row, columns), columns))) {
          isPaused = true;
          dbhan.client.pause();
        }
      })
      .on('end', () => pass.end());

    pass.on('drain', resumeQuery);
    pass.on('close', () => {
      isClosed = true;
      resumeQuery();
    });

    return pass;
  },
  async getVersion(dbhan) {
    const { rows } = await this.query(dbhan, "show variables like 'version'");
    const version = rows[0].Value;
    if (version) {
      const m = version.match(/(.*)-MariaDB-/);
      if (m) {
        return {
          version,
          versionText: `MariaDB ${m[1]}`,
        };
      }
    }

    return {
      version,
      versionText: `MySQL ${version}`,
    };
  },
  async listDatabases(dbhan) {
    const { rows } = await this.query(dbhan, 'show databases');
    return rows.map(x => ({ name: x.Database }));
  },

  async listVariables(dbhan) {
    const { rows } = await this.query(dbhan, 'SHOW VARIABLES');
    return rows.map(row => ({
      variable: row.Variable_name,
      value: row.Value,
    }));
  },

  async listProcesses(dbhan) {
    const { rows } = await this.query(dbhan, 'SHOW FULL PROCESSLIST');
    return rows.map(row => ({
      processId: row.Id,
      connectionId: null,
      client: row.Host,
      operation: row.Info,
      namespace: row.Database,
      runningTime: row.Time,
      state: row.State,
      waitingFor: row.State && row.State.includes('Waiting'),
    }));
  },

  async killProcess(dbhan, processId) {
    await this.query(dbhan, `KILL ${processId}`);
  },

  async setTransactionIsolationLevel(dbhan, level) {
    if (this.isolationLevels && level && !this.isolationLevels.includes(level)) {
      throw new Error(
        `Isolation level "${level}" is not supported. Supported levels: ${this.isolationLevels.join(', ')}`
      );
    }
    await this.query(dbhan, `SET SESSION TRANSACTION ISOLATION LEVEL ${level}`);
  },

  async serverSummary(dbhan) {
    const [variables, processes, databases] = await Promise.all([
      this.listVariables(dbhan),
      this.listProcesses(dbhan),
      this.listDatabases(dbhan),
    ]);

    return {
      variables,
      processes: processes.map(p => ({
        processId: p.processId,
        connectionId: p.connectionId,
        client: p.client,
        operation: p.operation,
        namespace: p.namespace,
        runningTime: p.runningTime,
        state: p.state,
        waitingFor: p.waitingFor,
      })),
      databases: {
        rows: databases.map(db => ({
          name: db.name,
        })),
        columns: [
          {
            filterable: true,
            sortable: true,
            header: 'Database',
            fieldName: 'name',
            type: 'data',
          },
        ],
      },
    };
  },

  async writeTable(dbhan, name, options) {
    // @ts-ignore
    return createBulkInsertStreamBase(this, stream, dbhan, name, options);
  },
  getAuthTypes() {
    const res = [
      {
        title: 'Host and port',
        name: 'hostPort',
        disabledFields: ['socketPath'],
      },
      {
        title: 'Socket',
        name: 'socket',
        disabledFields: ['server', 'port'],
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
}));

drivers.initialize = dbgateEnv => {
  authProxy = dbgateEnv.authProxy;
};

module.exports = drivers;
