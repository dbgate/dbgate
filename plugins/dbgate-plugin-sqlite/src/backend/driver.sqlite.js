// @ts-check
const _ = require('lodash');
const crypto = require('crypto');
const fs = require('fs');
const stream = require('stream');
const { finished } = require('stream/promises');
const Analyser = require('./Analyser');
const driverBases = require('../frontend/drivers');
const { splitQuery, sqliteSplitterOptions } = require('dbgate-query-splitter');
const { getLogger, createBulkInsertStreamBase, extractErrorLogData } = global.DBGATE_PACKAGES['dbgate-tools'];
const { runStreamItem, waitForDrain, modifyRow } = require('./helpers');
const { dumpSqlite, restoreSqlDump } = require('dbgate-sqlite-dumper');
const { fromBetterSqlite3 } = require('dbgate-sqlite-dumper/better-sqlite3');
const {
  createDumpProgressReporter,
  createRestoreProgressReporter,
  formatRestoreStatementError,
  formatSqliteRestoreError,
  getSqliteDumpOptions,
} = require('./sqliteDumperSupport');

const logger = getLogger('sqliteDriver');

let betterSqliteValue;
function getBetterSqlite() {
  if (!betterSqliteValue) {
    betterSqliteValue = require('better-sqlite3');
  }
  return betterSqliteValue;
}

/** @type {import('dbgate-types').EngineDriver} */
const driver = {
  ...driverBases[0],
  analyserClass: Analyser,
  async connect({ databaseFile, isReadOnly }) {
    const Database = getBetterSqlite();
    const client = new Database(databaseFile, { readonly: !!isReadOnly });
    client.defaultSafeIntegers(true);
    return {
      client,
    };
  },
  async close(dbhan) {
    // sqlite close is sync, returns this
    dbhan.client.close();
  },
  // @ts-ignore
  async query(dbhan, sql) {
    const stmt = dbhan.client.prepare(sql);
    // stmt.raw();
    if (stmt.reader) {
      const columns = stmt.columns();
      const rows = stmt.all();
      return {
        rows: rows.map((row) => modifyRow(row, columns)),
        columns: columns.map((col) => ({
          columnName: col.name,
          dataType: col.type,
          tableName: col.table || undefined,
          tableSchema: col.database || undefined,
          sourceColumnName: col.column || undefined,
        })),
      };
    } else {
      stmt.run();
      return {
        rows: [],
        columns: [],
      };
    }
  },
  async stream(dbhan, sql, options) {
    const sqlSplitted = splitQuery(sql, sqliteSplitterOptions);

    const rowCounter = { count: 0, date: null };

    const inTransaction = dbhan.client.transaction(() => {
      for (const sqlItem of sqlSplitted) {
        runStreamItem(dbhan, sqlItem, options, rowCounter, driverBases[0].engine);
      }

      if (rowCounter.date) {
        options.info({
          message: `${rowCounter.count} rows affected`,
          time: new Date(),
          severity: 'info',
          rowsAffected: rowCounter.count,
        });
      }
    });

    try {
      inTransaction();
    } catch (error) {
      logger.error(extractErrorLogData(error), 'DBGM-00203 Stream error');
      const { message, procName } = error;
      options.info({
        message,
        line: 0,
        procedure: procName,
        time: new Date(),
        severity: 'error',
      });
    }

    options.done();
    // return stream;
  },
  async script(dbhan, sql) {
    const inTransaction = dbhan.client.transaction(() => {
      for (const sqlItem of splitQuery(sql, this.getQuerySplitterOptions('script'))) {
        const stmt = dbhan.client.prepare(sqlItem);
        stmt.run();
      }
    });
    inTransaction();
  },

  async readQueryTask(stmt, pass) {
    // let sent = 0;
    const columns = stmt.columns();
    for (const row of stmt.iterate()) {
      // sent++;
      if (!pass.write(modifyRow(row, columns))) {
        // console.log('WAIT DRAIN', sent);
        await waitForDrain(pass);
      }
    }
    pass.end();
  },
  async readQuery(dbhan, sql, structure) {
    const pass = new stream.PassThrough({
      objectMode: true,
      highWaterMark: 100,
    });

    const stmt = dbhan.client.prepare(sql);
    const columns = stmt.columns();

    pass.write({
      __isStreamHeader: true,
      engine: driverBases[0].engine,
      ...(structure || {
        columns: columns.map((col) => ({
          columnName: col.name,
          dataType: col.type,
          tableName: col.table || undefined,
          tableSchema: col.database || undefined,
          sourceColumnName: col.column || undefined,
        })),
      }),
    });
    this.readQueryTask(stmt, pass);

    return pass;
  },
  async writeTable(dbhan, name, options) {
    return createBulkInsertStreamBase(this, stream, dbhan, name, options);
  },
  async backupDatabase(connection, settings, runner) {
    const { outputFile, selectedTables = [], skippedTables = [], options = {} } = settings;
    const dumpOptions = getSqliteDumpOptions(selectedTables, skippedTables, options);
    // Dump into a sibling temporary file and publish it with a rename only once the dump finished.
    // A failed or cancelled run therefore never leaves a truncated file behind, nor does it touch
    // an existing backup stored under the requested name.
    const tempFile = `${outputFile}.${crypto.randomBytes(6).toString('hex')}.part`;
    let dbhan = null;
    let output = null;

    try {
      // A backup only reads, so the file is opened read-only whatever the connection says.
      dbhan = await this.connect({ ...connection, isReadOnly: true });
      output = fs.createWriteStream(tempFile);
      const result = await dumpSqlite(
        fromBetterSqlite3(dbhan.client),
        dumpOptions,
        output,
        createDumpProgressReporter(runner),
        runner.signal
      );
      if (result.cancelled) {
        throw new Error('DBGM-00000 SQLite backup cancelled');
      }
      output.end();
      await finished(output);
      await fs.promises.rename(tempFile, outputFile);
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
      if (output) {
        output.destroy();
        // wait for the descriptor to be released, otherwise the cleanup below can fail on Windows
        await finished(output).catch(() => {});
      }
      await fs.promises.rm(tempFile, { force: true }).catch(() => {});
      if (runner.signal?.aborted) {
        throw new Error('DBGM-00000 SQLite backup cancelled', { cause: error });
      }
      throw error;
    } finally {
      if (dbhan) await this.close(dbhan);
    }
  },

  async restoreDatabase(connection, settings, runner) {
    const { inputFile, options = {} } = settings;
    if (connection.isReadOnly) {
      throw new Error('DBGM-00000 Cannot restore into a read-only SQLite connection');
    }
    let dbhan = null;
    let input = null;

    try {
      dbhan = await this.connect(connection);
      input = fs.createReadStream(inputFile, { highWaterMark: 64 * 1024 });
      const stopOnError = options.stopOnError ?? true;
      const progress = createRestoreProgressReporter(runner);
      const result = await restoreSqlDump({
        connection: fromBetterSqlite3(dbhan.client),
        source: input,
        signal: runner.signal,
        options: { stopOnError },
        progress,
      });
      // Reported before the error branch below, because a failed restore is exactly when warnings
      // like a rolled-back transaction matter most.
      for (const warning of result.warnings) {
        runner.info({ message: warning.message, severity: 'warning' });
      }
      if (result.cancelled) {
        throw new Error('DBGM-00000 SQLite restore cancelled');
      }
      if (result.errors.length > 0) {
        for (const error of result.errors) {
          if (progress.reportedStatementIndexes.has(error.statementIndex)) continue;
          runner.info({ message: formatRestoreStatementError(error), severity: 'error' });
        }
        const count = result.errors.length;
        throw new Error(
          `DBGM-00000 SQLite restore ${stopOnError ? 'stopped at' : 'finished with'} ${count} error${
            count == 1 ? '' : 's'
          }: ${formatRestoreStatementError(result.errors[0])}`
        );
      }
      runner.info({
        message: `Restored ${result.statementsExecuted} SQL statements and ${result.rowsRestored.toLocaleString(
          'en-US'
        )} rows (${result.bytesConsumed.toLocaleString('en-US')} bytes read)`,
        severity: 'info',
      });
    } catch (error) {
      if (runner.signal?.aborted) {
        throw new Error('DBGM-00000 SQLite restore cancelled', { cause: error });
      }
      const formatted = formatSqliteRestoreError(error);
      if (formatted) throw new Error(formatted, { cause: error });
      throw error;
    } finally {
      input?.destroy();
      if (dbhan) await this.close(dbhan);
    }
  },

  async getVersion(dbhan) {
    const { rows } = await this.query(dbhan, 'select sqlite_version() as version');
    const { version } = rows[0];

    return {
      version,
      versionText: `SQLite ${version}`,
    };
  },
};

module.exports = driver;
