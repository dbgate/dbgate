const crypto = require('crypto');
const fs = require('fs');
const { finished } = require('stream/promises');
const { dumpSqlite, restoreSqlDump } = require('dbgate-sqlite-dumper');
const {
  createDumpProgressReporter,
  createRestoreProgressReporter,
  formatRestoreStatementError,
  formatSqliteRestoreError,
  getSqliteDumpOptions,
} = require('./sqliteDumperSupport');

/**
 * Backs up a SQLite-family database with dbgate-sqlite-dumper.
 *
 * Shared by the SQLite and libSQL drivers, which differ only in how a driver handle becomes a
 * dumper connection (`createDumperConnection`) and in the product name shown in messages.
 */
async function backupWithSqliteDumper(driver, connection, settings, runner, { product, createDumperConnection }) {
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
    dbhan = await driver.connect({ ...connection, isReadOnly: true });
    output = fs.createWriteStream(tempFile);
    const result = await dumpSqlite(
      createDumperConnection(dbhan.client),
      dumpOptions,
      output,
      createDumpProgressReporter(runner, product),
      runner.signal
    );
    if (result.cancelled) {
      throw new Error(`DBGM-00000 ${product} backup cancelled`);
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
      throw new Error(`DBGM-00000 ${product} backup cancelled`, { cause: error });
    }
    throw error;
  } finally {
    if (dbhan) await driver.close(dbhan);
  }
}

/** Restores a plain-SQL dump into a SQLite-family database with dbgate-sqlite-dumper. */
async function restoreWithSqliteDumper(driver, connection, settings, runner, { product, createDumperConnection }) {
  const { inputFile, options = {} } = settings;
  if (connection.isReadOnly) {
    throw new Error(`DBGM-00000 Cannot restore into a read-only ${product} connection`);
  }
  let dbhan = null;
  let input = null;

  try {
    dbhan = await driver.connect(connection);
    input = fs.createReadStream(inputFile, { highWaterMark: 64 * 1024 });
    const stopOnError = options.stopOnError ?? true;
    const progress = createRestoreProgressReporter(runner, product);
    const result = await restoreSqlDump({
      connection: createDumperConnection(dbhan.client),
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
      throw new Error(`DBGM-00000 ${product} restore cancelled`);
    }
    if (result.errors.length > 0) {
      for (const error of result.errors) {
        if (progress.reportedStatementIndexes.has(error.statementIndex)) continue;
        runner.info({ message: formatRestoreStatementError(error), severity: 'error' });
      }
      const count = result.errors.length;
      throw new Error(
        `DBGM-00000 ${product} restore ${stopOnError ? 'stopped at' : 'finished with'} ${count} error${
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
      throw new Error(`DBGM-00000 ${product} restore cancelled`, { cause: error });
    }
    const formatted = formatSqliteRestoreError(error);
    if (formatted) throw new Error(formatted, { cause: error });
    throw error;
  } finally {
    input?.destroy();
    if (dbhan) await driver.close(dbhan);
  }
}

module.exports = {
  backupWithSqliteDumper,
  restoreWithSqliteDumper,
};
