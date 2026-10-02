const { SqlParseError } = require('dbgate-sqlite-dumper');

/** SQLite has no schemas in DbGate's model, so selected and skipped tables map onto names directly. */
function getSqliteDumpSelection(selectedTables, skippedTables) {
  const tables = selectedTables.map((table) => table.pureName);
  const excludeTables = skippedTables.map((table) => table.pureName);
  if (excludeTables.length == 0) return undefined;
  return {
    ...(tables.length > 0 ? { tables } : {}),
    excludeTables,
  };
}

function getSqliteDumpOptions(selectedTables, skippedTables, options) {
  if (options.dataOnly && options.schemaOnly) {
    throw new Error('DBGM-00000 Data-only and schema-only backup options cannot be enabled together');
  }
  const selection = getSqliteDumpSelection(selectedTables, skippedTables);
  return {
    mode: options.dataOnly ? 'data-only' : options.schemaOnly ? 'schema-only' : 'full',
    ...(selection ? { selection } : {}),
    render: {
      addDropStatements: !!options.includeDropStatements,
      // Off in the native .dump, but an application tracking its migrations in user_version
      // would otherwise restore into a database that looks unmigrated.
      includeDatabaseSettings: options.includeDatabaseSettings !== false,
    },
    dataExport: {
      preserveRowids: !!options.preserveRowids,
    },
  };
}

function formatDumpProgress(progress, product = 'SQLite') {
  if (progress.phase == 'exporting-data') {
    const table = progress.tableName || progress.objectName || 'table data';
    return `Exporting ${table}: ${(progress.rowsExported || 0).toLocaleString('en-US')} rows, ${(
      progress.bytesWritten || 0
    ).toLocaleString('en-US')} bytes`;
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
    'detecting-version': `Detected SQLite ${progress.message || ''}`.trim(),
    'planning-archive': `Planning ${product} dump (${progress.objectsTotal || 0} objects)`,
    'rendering-schema': `Writing ${product} database structure`,
    finalizing: `Finalizing ${product} dump (${(progress.bytesWritten || 0).toLocaleString('en-US')} bytes)`,
  };
  return labels[progress.phase] || null;
}

function createDumpProgressReporter(runner, product = 'SQLite') {
  let lastRowProgress = 0;
  return (progress) => {
    const now = Date.now();
    if (progress.phase == 'exporting-data' && progress.exportState == 'progress' && now - lastRowProgress < 750) return;
    if (progress.phase == 'exporting-data') lastRowProgress = now;
    const message = formatDumpProgress(progress, product);
    if (message) runner.info({ message, severity: 'info' });
  };
}

function formatRestoreStatementError(error) {
  const sqliteError = error.sqliteError;
  const location = error.location;
  return [
    `Statement ${error.statementIndex + 1} failed`,
    location && `at lines ${location.startLine}-${location.endLine}`,
    sqliteError?.code && `${sqliteError.code}:`,
    sqliteError?.message || error.message,
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
 * result errors again. The progress event carries no sqliteError, so the driver puts the richer
 * result copy of the first failure into the error it throws.
 */
function createRestoreProgressReporter(runner, product = 'SQLite') {
  const reportedStatementIndexes = new Set();
  let lastProgress = 0;
  let currentObject = null;
  const reporter = (progress) => {
    const now = Date.now();
    if (progress.error) {
      reportedStatementIndexes.add(progress.error.statementIndex);
      runner.info({ message: formatRestoreStatementError(progress.error), severity: 'error' });
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

function formatSqliteRestoreError(error) {
  if (error instanceof SqlParseError) {
    // Most parse errors already name their line; only add it when the message does not.
    const mentionsLine = error.line && error.message.includes(`line ${error.line}`);
    return `DBGM-00000 ${error.message}${error.line && !mentionsLine ? ` (line ${error.line})` : ''}`;
  }
  return null;
}

module.exports = {
  createDumpProgressReporter,
  createRestoreProgressReporter,
  formatDumpProgress,
  formatRestoreStatementError,
  formatSqliteRestoreError,
  getSqliteDumpOptions,
  getSqliteDumpSelection,
};
