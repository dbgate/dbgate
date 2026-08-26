const { createPerformanceReportMarkdown } = require('dbgate-mssql-dumper');

function createPerformanceTracker({
  operation,
  database,
  engine,
  inputBytes,
  now = () => Date.now(),
  renderReport = createPerformanceReportMarkdown,
}) {
  const startedAtMs = now();
  const phaseDurations = new Map();
  const tables = [];
  let nativeBulkOperations = [];
  let activePhase = 'connecting';
  let activePhaseStartedAt = startedAtMs;
  let activeTable = null;

  function finishPhase(at) {
    if (!activePhase) return;
    phaseDurations.set(activePhase, (phaseDurations.get(activePhase) || 0) + at - activePhaseStartedAt);
  }

  function startPhase(name, at = now()) {
    if (activePhase == name) return;
    finishPhase(at);
    activePhase = name;
    activePhaseStartedAt = at;
  }

  function finishTable(at = now()) {
    if (!activeTable) return;
    tables.push({
      schemaName: activeTable.schemaName,
      tableName: activeTable.tableName,
      mode: activeTable.mode,
      ...(activeTable.reason ? { reason: activeTable.reason } : {}),
      rows: Math.max(0, activeTable.rows),
      durationMs: Math.max(0, activeTable.durationMs ?? at - activeTable.startedAt),
      ...(activeTable.batches == null ? {} : { batches: activeTable.batches }),
      ...(activeTable.bytes == null ? {} : { bytes: Math.max(0, activeTable.bytes) }),
    });
    activeTable = null;
  }

  function handleDumpProgress(progress, at) {
    if (progress.phase != 'exporting-data' || !progress.schemaName || !progress.tableName) {
      finishTable(at);
      return;
    }
    const key = `${progress.schemaName}.${progress.tableName}`;
    if (progress.exportState == 'started' || activeTable?.key != key) {
      finishTable(at);
      activeTable = {
        key,
        schemaName: progress.schemaName,
        tableName: progress.tableName,
        mode: 'sql-insert-export',
        startedAt: at,
        rows: 0,
        startBytes: progress.bytesWritten || 0,
        bytes: 0,
      };
    }
    if (!activeTable) return;
    activeTable.rows = progress.rowsExported || 0;
    activeTable.bytes = Math.max(0, (progress.bytesWritten || activeTable.startBytes) - activeTable.startBytes);
    if (['finished', 'failed', 'cancelled'].includes(progress.exportState)) finishTable(at);
  }

  function handleRestoreProgress(progress, at) {
    if (progress.phase != 'executing' || !progress.executionMode || !progress.schemaName || !progress.tableName) {
      if (progress.phase == 'executing' || progress.phase == 'finalizing') finishTable(at);
      return;
    }
    const key = `${progress.executionMode}:${progress.executionReason || ''}:${progress.schemaName}.${progress.tableName}`;
    if (progress.executionState == 'started' && activeTable?.key != key) {
      finishTable(at);
      activeTable = {
        key,
        schemaName: progress.schemaName,
        tableName: progress.tableName,
        mode: progress.executionMode,
        reason: progress.executionReason,
        startRows: progress.rowsRestored || 0,
        rows: 0,
        batches: 0,
        durationMs: 0,
        executionStartedAt: at,
      };
    }
    if (!activeTable || activeTable.key != key) return;
    if (progress.executionState == 'started') activeTable.executionStartedAt = at;
    if (progress.executionState == 'finished' || progress.executionState == 'failed') {
      activeTable.batches += 1;
      activeTable.rows = Math.max(0, (progress.rowsRestored || activeTable.startRows) - activeTable.startRows);
      activeTable.durationMs += Math.max(0, at - activeTable.executionStartedAt);
      activeTable.executionStartedAt = at;
      if (progress.executionState == 'failed') finishTable(at);
    }
  }

  return {
    progress(progress) {
      const at = now();
      startPhase(progress.phase, at);
      if (operation == 'dump') handleDumpProgress(progress, at);
      else handleRestoreProgress(progress, at);
    },
    setEngine(value) {
      engine = value;
    },
    setNativeBulkOperations(value) {
      nativeBulkOperations = Array.isArray(value) ? value.map(operation => ({ ...operation })) : [];
    },
    finish({ status, rows, batches, outputBytes, warnings, errors }) {
      const finishedAtMs = now();
      finishTable(finishedAtMs);
      finishPhase(finishedAtMs);
      const report = {
        formatVersion: 1,
        operation,
        status,
        startedAt: new Date(startedAtMs).toISOString(),
        finishedAt: new Date(finishedAtMs).toISOString(),
        durationMs: finishedAtMs - startedAtMs,
        database,
        engine,
        inputBytes,
        outputBytes,
        rows,
        batches,
        warnings,
        errors,
        phases: [...phaseDurations].map(([name, durationMs]) => ({ name, durationMs })),
        tables,
        nativeBulkOperations,
      };
      return renderReport(report);
    },
  };
}

function performanceReportFileName(operation, date = new Date()) {
  return `mssql-${operation}-performance-${date.toISOString().replaceAll(':', '-').replaceAll('.', '-')}.md`;
}

module.exports = { createPerformanceTracker, performanceReportFileName };
