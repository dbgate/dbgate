const { SqlParseError } = require('dbgate-mysql-dumper');

function getMysqlDumpSelection(database, selectedTables, skippedTables) {
  const belongsToDatabase = table => !table.schemaName || table.schemaName == database;
  const tables = selectedTables.filter(belongsToDatabase).map(table => table.pureName);
  const excludeTables = skippedTables.filter(belongsToDatabase).map(table => table.pureName);
  if (tables.length == 0 && excludeTables.length == 0) return undefined;
  return {
    ...(tables.length > 0 ? { tables } : {}),
    ...(excludeTables.length > 0 ? { excludeTables } : {}),
  };
}

function getMysqlDumpConsistency(options) {
  if (options.lockTables) return 'lock-all-tables';
  if (options.skipLockTables) return 'none';
  if (options.singleTransaction) return 'single-transaction';
  // mysqldump locks all tables when nothing is requested; keep the same default so that switching
  // between the native tool and dbgate-mysql-dumper does not silently change how the source is read.
  return 'lock-all-tables';
}

function getMysqlDumpOptions(database, selectedTables, skippedTables, options) {
  if (options.noData && options.noStructure) {
    throw new Error('DBGM-00000 No-data and no-structure backup options cannot be enabled together');
  }
  const consistencyOptions = [options.lockTables, options.skipLockTables, options.singleTransaction].filter(Boolean);
  if (consistencyOptions.length > 1) {
    throw new Error('DBGM-00000 Lock tables, skip lock tables and single transaction are mutually exclusive');
  }
  const selection = getMysqlDumpSelection(database, selectedTables, skippedTables);
  return {
    mode: options.noData ? 'schema-only' : options.noStructure ? 'data-only' : 'full',
    databaseName: database,
    ...(selection ? { selection } : {}),
    objectKinds: {
      includeEvents: options.includeEvents !== false,
      includeRoutines: options.includeRoutines !== false,
      includeTriggers: options.includeTriggers !== false,
    },
    consistency: getMysqlDumpConsistency(options),
    render: {
      includeCreateDatabase: !!options.createDatabase,
      includeUseDatabase: !!options.createDatabase,
      extendedInsert: options.extendedInsert !== false,
      completeInsert: !!options.completeInsert,
      hexBlob: options.hexBlob !== false,
    },
  };
}

function formatDumpProgress(progress, product) {
  if (progress.phase == 'exporting-data') {
    const table = progress.tableName || progress.objectName || 'table data';
    const rows = progress.totalRowsExported ?? progress.rowsExported ?? 0;
    return `Exporting ${table}: ${rows.toLocaleString('en-US')} rows, ${(progress.bytesWritten || 0).toLocaleString(
      'en-US'
    )} bytes`;
  }
  if (progress.objectName) {
    return `Processing ${progress.objectName}${
      progress.objectsProcessed === undefined || progress.objectsTotal === undefined
        ? ''
        : ` (${progress.objectsProcessed}/${progress.objectsTotal})`
    }`;
  }
  const labels = {
    connecting: `Starting ${product} backup`,
    'starting-snapshot': `Starting consistent ${product} snapshot`,
    introspecting: `Reading ${product} database structure`,
    'detecting-version': `Detected ${progress.message || `${product} server`}`,
    'planning-archive': `Planning ${product} dump (${progress.objectsTotal || 0} objects)`,
    'rendering-schema': `Writing ${product} database structure`,
    finalizing: `Finalizing ${product} dump (${(progress.bytesWritten || 0).toLocaleString('en-US')} bytes)`,
  };
  return labels[progress.phase] || null;
}

function createDumpProgressReporter(runner, product) {
  let lastRowProgress = 0;
  return progress => {
    const now = Date.now();
    if (progress.phase == 'exporting-data' && progress.exportState == 'progress' && now - lastRowProgress < 750) return;
    if (progress.phase == 'exporting-data') lastRowProgress = now;
    const message = formatDumpProgress(progress, product);
    if (message) runner.info({ message, severity: 'info' });
  };
}

function formatRestoreStatementError(error, product = 'database') {
  const server = error.serverError;
  const location = error.location;
  return [
    `Statement ${error.statementIndex + 1} failed`,
    location && `at lines ${location.startLine}-${location.endLine}`,
    error.delimiter && error.delimiter != ';' && `(delimiter ${JSON.stringify(error.delimiter)})`,
    server?.code && `${product} ${server.code}${server.errno === undefined ? '' : ` (${server.errno})`}:`,
    server?.message || error.message,
    error.sqlPreview && `SQL: ${error.sqlPreview}`,
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Reports restore progress, and remembers which statements it already reported an error for.
 *
 * restoreSqlDump emits every failure twice - once through this callback and once in
 * SqlDumpRestoreResult.errors - so the caller consults reportedStatementIndexes before logging the
 * result errors again. Errors are reported here rather than only at the end so that a long restore
 * shows failures as they happen; the progress event carries no serverError, so the driver puts the
 * richer result copy of the first failure into the error it throws.
 */
function createRestoreProgressReporter(runner, product) {
  const reportedStatementIndexes = new Set();
  let lastProgress = 0;
  let currentObject = null;
  const reporter = progress => {
    const now = Date.now();
    if (progress.error) {
      reportedStatementIndexes.add(progress.error.statementIndex);
      runner.info({
        message: formatRestoreStatementError({ ...progress.error, delimiter: progress.delimiter }, product),
        severity: 'error',
      });
      return;
    }
    if (progress.currentObject && progress.currentObject != currentObject) {
      currentObject = progress.currentObject;
      runner.info({ message: `Restoring ${currentObject}`, severity: 'info' });
      return;
    }
    if (progress.phase == 'connecting') {
      runner.info({ message: `Starting ${product} restore`, severity: 'info' });
      return;
    }
    if (progress.phase == 'finalizing') {
      runner.info({ message: `Finalizing ${product} restore`, severity: 'info' });
      return;
    }
    if (progress.executionState == 'finished' && now - lastProgress >= 750) {
      lastProgress = now;
      runner.info({
        message: `Restored ${progress.statementsProcessed || 0} statements and ${(
          progress.rowsRestored || 0
        ).toLocaleString('en-US')} rows`,
        severity: 'info',
      });
    }
  };
  reporter.reportedStatementIndexes = reportedStatementIndexes;
  return reporter;
}

function formatMysqlRestoreError(error) {
  if (error instanceof SqlParseError) {
    return `DBGM-00000 ${error.message}${error.line ? ` (line ${error.line})` : ''}`;
  }
  return null;
}

module.exports = {
  createDumpProgressReporter,
  createRestoreProgressReporter,
  formatDumpProgress,
  formatMysqlRestoreError,
  formatRestoreStatementError,
  getMysqlDumpConsistency,
  getMysqlDumpOptions,
  getMysqlDumpSelection,
};
