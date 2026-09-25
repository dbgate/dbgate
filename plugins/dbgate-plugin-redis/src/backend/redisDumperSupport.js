const { RedisDumpParseError } = require('dbgate-redis-dumper');

/** `db3` (DbGate's database name for a Redis logical database) → 3. */
function parseDatabaseIndex(database) {
  if (typeof database == 'number') return database;
  if (typeof database == 'string') {
    const match = /^db(\d+)$/.exec(database);
    if (match) return parseInt(match[1], 10);
  }
  return undefined;
}

function getRedisDumpOptions(options = {}) {
  const format = options.format == 'resp' ? 'resp' : 'text';
  const keyPattern = options.keyPattern?.trim();
  return {
    format,
    // One database per backup, written without SELECT, so the file restores into whichever database
    // the restore targets - the same model as a single-database SQL dump.
    databases: options.allDatabases ? 'all' : 'current',
    ...(keyPattern && keyPattern != '*' ? { selection: { match: keyPattern } } : {}),
    strategy: options.strategy == 'payload' ? 'payload' : 'commands',
    expiration: ['relative', 'none'].includes(options.expiration) ? options.expiration : 'absolute',
    replace: options.replace !== false,
    streamGroups: options.streamGroups !== false,
    header: true,
  };
}

function formatDumpProgress(progress) {
  switch (progress.phase) {
    case 'connecting':
      return 'Starting Redis backup';
    case 'detecting-version':
      return 'Detecting Redis server version';
    case 'scanning':
      return `Scanning db${progress.database}${
        progress.keysEstimated === undefined ? '' : ` (${progress.keysEstimated.toLocaleString('en-US')} keys)`
      }`;
    case 'exporting-keys':
      if (progress.keyName) return `Exporting key ${progress.keyName}`;
      return `Exported ${(progress.totalKeysExported || 0).toLocaleString('en-US')} keys, ${(
        progress.bytesWritten || 0
      ).toLocaleString('en-US')} bytes`;
    case 'finalizing':
      return `Finalizing Redis dump (${(progress.bytesWritten || 0).toLocaleString('en-US')} bytes)`;
    default:
      return null;
  }
}

function createDumpProgressReporter(runner) {
  let lastKeyProgress = 0;
  return (progress) => {
    const now = Date.now();
    if (progress.phase == 'exporting-keys' && !progress.keyName) {
      if (now - lastKeyProgress < 750) return;
      lastKeyProgress = now;
    }
    const message = formatDumpProgress(progress);
    if (message) runner.info({ message, severity: 'info' });
  };
}

function formatRestoreCommandError(error) {
  const location = error.location;
  return [
    `Command ${error.commandIndex + 1} failed`,
    location?.line ? `at line ${location.line}` : location && `at byte ${location.offset}`,
    error.kind == 'refused' && '(refused)',
    error.serverError?.prefix && `Redis ${error.serverError.prefix}:`,
    error.serverError?.message || error.message,
    error.commandPreview && `Command: ${error.commandPreview}`,
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Reports restore progress, and remembers which commands it already reported an error for.
 *
 * restoreRedisDump reports every failure twice - once through this callback as it happens and once
 * in RedisDumpRestoreResult.errors - so the caller consults reportedCommandIndexes before logging the
 * result errors again. The progress copy carries no serverError, so the driver puts the richer
 * result copy of the first failure into the error it throws.
 */
function createRestoreProgressReporter(runner) {
  const reportedCommandIndexes = new Set();
  let lastProgress = 0;
  const reporter = (progress) => {
    if (progress.error) {
      reportedCommandIndexes.add(progress.error.commandIndex);
      runner.info({ message: formatRestoreCommandError(progress.error), severity: 'error' });
      return;
    }
    if (progress.phase == 'connecting') {
      runner.info({ message: 'Starting Redis restore', severity: 'info' });
      return;
    }
    if (progress.phase == 'finalizing') {
      runner.info({ message: 'Finalizing Redis restore', severity: 'info' });
      return;
    }
    const now = Date.now();
    if (progress.phase == 'executing' && now - lastProgress >= 750) {
      lastProgress = now;
      runner.info({
        message: `Executed ${(progress.commandsProcessed || 0).toLocaleString('en-US')} commands (${(
          progress.bytesConsumed || 0
        ).toLocaleString('en-US')} bytes read)`,
        severity: 'info',
      });
    }
  };
  reporter.reportedCommandIndexes = reportedCommandIndexes;
  return reporter;
}

function formatRedisRestoreError(error) {
  if (error instanceof RedisDumpParseError) {
    const location = error.location;
    return `DBGM-00000 ${error.message}${
      location?.line ? ` (line ${location.line})` : location ? ` (byte ${location.offset})` : ''
    }`;
  }
  return null;
}

module.exports = {
  createDumpProgressReporter,
  createRestoreProgressReporter,
  formatDumpProgress,
  formatRedisRestoreError,
  formatRestoreCommandError,
  getRedisDumpOptions,
  parseDatabaseIndex,
};
