const fs = require('fs');
const { streamSqlStatements } = require('dbgate-sqlite-dumper');
const { extractColumnNames, extractRowArrays } = require('./cloudflare/d1ResultAdapter');

/**
 * Statements per D1 request, and their total size. A D1 batch runs as one transaction, so a
 * failure leaves nothing of its batch behind; requests stay well below the API's size limits.
 */
const BATCH_STATEMENTS = 250;
const BATCH_BYTES = 1024 * 1024;

/**
 * D1's limit on the length of one SQL statement. A dump has one INSERT per row, so a row with a
 * large text or BLOB value exceeds it; such a row cannot be restored through D1's SQL API at all.
 */
const MAX_STATEMENT_BYTES = 100000;

function isOversized(statement) {
  return Buffer.byteLength(statement.sql) > MAX_STATEMENT_BYTES;
}

function oversizedMessage(statement) {
  const table = statement.info.objectName ? ` (table ${statement.info.objectName})` : '';
  return `The statement at line ${statement.location.startLine}${table} has ${Buffer.byteLength(
    statement.sql
  )} bytes, more than the ${MAX_STATEMENT_BYTES} bytes Cloudflare D1 accepts in one statement`;
}

/**
 * D1 enforces foreign keys and has no `PRAGMA foreign_keys = OFF`. Deferring them to the end of
 * each batch is what Cloudflare's import guide recommends instead.
 */
const DEFER_FOREIGN_KEYS = 'PRAGMA defer_foreign_keys = on';

function isReservedName(name) {
  return typeof name == 'string' && name.toLowerCase().startsWith('_cf_');
}

/**
 * What to do with one statement of a SQLite dump when restoring it into D1:
 * - `skip`: transaction control (every batch is its own transaction) and `PRAGMA foreign_keys`
 *   (replaced by DEFER_FOREIGN_KEYS);
 * - `optional`: AUTOINCREMENT counters, statistics and user_version / application_id, which D1
 *   may refuse to write - run after the data, and only reported as a warning if refused;
 * - `refuse`: `PRAGMA writable_schema`, through which a dump recreates virtual tables, and which
 *   D1 never allows;
 * - `run`: everything else.
 */
function classifyStatement(statement) {
  const { info } = statement;
  if (info.transactionControl) return { action: 'skip' };
  if (info.verb == 'PRAGMA') {
    if (info.pragmaName == 'foreign_keys') return { action: 'skip' };
    if (info.pragmaName == 'writable_schema') return { action: 'refuse' };
    if (info.pragmaName == 'user_version' || info.pragmaName == 'application_id') {
      return { action: 'optional', group: info.pragmaName };
    }
  }
  if (info.verb == 'ANALYZE') return { action: 'optional', group: 'statistics' };
  const objectName = String(info.objectName ?? '').toLowerCase();
  if ((info.verb == 'INSERT' || info.verb == 'DELETE') && objectName == 'sqlite_sequence') {
    return { action: 'optional', group: 'sqlite_sequence' };
  }
  if ((info.verb == 'INSERT' || info.verb == 'DELETE') && objectName.startsWith('sqlite_stat')) {
    return { action: 'optional', group: 'statistics' };
  }
  if (isReservedName(info.objectName)) return { action: 'reserved' };
  return { action: 'run' };
}

const OPTIONAL_GROUP_LABELS = {
  sqlite_sequence: 'AUTOINCREMENT counters (sqlite_sequence)',
  statistics: 'query planner statistics (sqlite_stat*)',
  user_version: 'PRAGMA user_version',
  application_id: 'PRAGMA application_id',
};

function lineRange(statements) {
  const first = statements[0]?.location?.startLine;
  const last = statements[statements.length - 1]?.location?.endLine;
  return first == last ? `line ${first}` : `lines ${first}-${last}`;
}

/** Strips comments and string literals, so that only real REFERENCES clauses are seen. */
function stripLiteralsAndComments(sql) {
  return sql.replace(/'(?:[^']|'')*'|--[^\n]*|\/\*[\s\S]*?\*\//g, ' ');
}

const REFERENCES_REGEX =
  /\bREFERENCES\s+(?:("(?:[^"]|"")+"|\[[^\]]+\]|`(?:[^`]|``)+`|[\w$]+)\s*\.\s*)?("(?:[^"]|"")+"|\[[^\]]+\]|`(?:[^`]|``)+`|[\w$]+)/gi;

function unquoteIdentifier(name) {
  if (/^".*"$/s.test(name)) return name.slice(1, -1).replace(/""/g, '"');
  if (/^`.*`$/s.test(name)) return name.slice(1, -1).replace(/``/g, '`');
  if (/^\[.*\]$/s.test(name)) return name.slice(1, -1);
  return name;
}

/** The tables a CREATE TABLE statement's foreign keys refer to, lower-cased. */
function referencedTables(sql) {
  const names = new Set();
  for (const match of stripLiteralsAndComments(sql).matchAll(REFERENCES_REGEX)) {
    names.add(unquoteIdentifier(match[2]).toLowerCase());
  }
  return names;
}

/** Whether a statement is a row of user data, which the restore inserts table by table. */
function dataTable(statement) {
  const { info } = statement;
  if (info.verb != 'INSERT' || !info.objectName) return null;
  return info.objectName.toLowerCase();
}

/** DROP and CREATE TABLE statements run before any data, everything else after it. */
function isTableDefinition(statement) {
  const { info } = statement;
  return info.verb == 'DROP' || (info.verb == 'CREATE' && info.objectKind == 'TABLE');
}

/**
 * Orders the tables of a dump so that every table comes after the tables its foreign keys refer
 * to, as levels: the tables of one level refer only to tables of earlier levels. Tables on a
 * reference cycle share the last level.
 */
function referenceLevels(tables) {
  const remaining = new Map(tables);
  const levels = [];
  while (remaining.size > 0) {
    const level = [...remaining.keys()].filter((name) =>
      [...remaining.get(name)].every((referenced) => referenced == name || !remaining.has(referenced))
    );
    const next = level.length > 0 ? level : [...remaining.keys()];
    levels.push(new Set(next));
    for (const name of next) remaining.delete(name);
  }
  return levels;
}

/**
 * The tables whose rows may refer to rows of the same level - a table referring to itself, or
 * tables on a reference cycle. Ordering by levels cannot put their rows in a valid order.
 */
function levelReferencingTables(tables, levels) {
  const result = new Set();
  for (const level of levels) {
    for (const name of level) {
      if ([...tables.get(name)].some((referenced) => level.has(referenced))) result.add(name);
    }
  }
  return result;
}

function isForeignKeyError(error) {
  return /FOREIGN KEY constraint failed/i.test(error?.message ?? '');
}

/**
 * Reads the whole dump before anything is sent to D1: a dump D1 cannot accept is refused without
 * leaving a half-restored database behind, and the foreign keys of its tables are collected.
 * Statements too long for D1 are refused as well when the restore stops on errors; otherwise
 * they are left out, each reported on its own.
 */
async function preflightD1Restore(inputFile, stopOnError, signal) {
  let refused = null;
  let oversized = null;
  let oversizedCount = 0;
  let statements = 0;
  const tables = new Map();
  const filledTables = new Set();
  for await (const statement of streamSqlStatements(fs.createReadStream(inputFile), {}, signal)) {
    statements++;
    const { action } = classifyStatement(statement);
    if (!refused && action == 'refuse') refused = statement;
    if (action != 'run') continue;
    if (isOversized(statement)) {
      if (!oversized) oversized = statement;
      oversizedCount++;
    }
    if (statement.info.verb == 'CREATE' && statement.info.objectKind == 'TABLE') {
      tables.set(String(statement.info.objectName).toLowerCase(), referencedTables(statement.sql));
    }
    const table = dataTable(statement);
    if (table != null) filledTables.add(table);
  }
  if (refused) {
    throw new Error(
      `DBGM-00000 The dump recreates virtual tables through PRAGMA writable_schema (line ${refused.location.startLine}), which Cloudflare D1 does not allow. Back up the database without its virtual tables, or restore it into SQLite.`
    );
  }
  if (oversized && stopOnError) {
    throw new Error(
      `DBGM-00000 ${oversizedMessage(oversized)}${
        oversizedCount > 1 ? ` (${oversizedCount} statements of the dump are too long)` : ''
      }. Nothing was restored. Restore without stopping on errors to leave these rows out, or restore into SQLite.`
    );
  }
  const uncreatedTables = [...filledTables].filter((table) => !tables.has(table));
  return { statements, tables, uncreatedTables };
}

/**
 * Adds the foreign keys of tables the dump fills but does not create (a data-only dump) to
 * `tables`, read from their definitions in the target database, which must already have them.
 */
async function addTargetReferences(api, tables, uncreatedTables) {
  if (uncreatedTables.length == 0) return;
  const [item] = await api.executeStatements([{ sql: "SELECT name, sql FROM sqlite_master WHERE type = 'table'" }]);
  const columns = extractColumnNames(item);
  const nameIndex = columns.indexOf('name');
  const sqlIndex = columns.indexOf('sql');
  const definitions = new Map(
    extractRowArrays(item).map((row) => [String(row[nameIndex]).toLowerCase(), row[sqlIndex]])
  );
  for (const table of uncreatedTables) {
    const sql = definitions.get(table);
    if (typeof sql == 'string') tables.set(table, referencedTables(sql));
  }
}

/**
 * Restores a SQLite dump (from DbGate's backup, or the native `sqlite3 .dump`) into a Cloudflare
 * D1 database through its REST API.
 *
 * D1 has no client transactions and enforces foreign keys, so the dump cannot run as one script:
 * - its statements go out in batches, each of which D1 runs as a transaction, with the foreign
 *   keys deferred to the end of the batch. A failed batch leaves nothing of itself behind, but
 *   the batches before it stay applied;
 * - a batch must therefore be valid on its own, so the data is inserted table by table, every
 *   table after the tables it refers to - first the tables, then the data, then the indexes,
 *   views and triggers, which is the order of a dump anyway. The dump file is read once for each
 *   level of that order. The foreign keys of tables the dump does not create (a data-only dump)
 *   are read from the target database.
 *
 * @param {import('./cloudflare/CloudflareD1Api').CloudflareD1Api} api
 * @param {{ inputFile: string, stopOnError?: boolean, signal?: AbortSignal,
 *   info: (message: string, severity?: string) => void }} options
 */
async function restoreD1Dump(api, { inputFile, stopOnError = true, signal, info }) {
  const throwIfAborted = () => {
    if (signal?.aborted) throw new Error('DBGM-00000 Cloudflare D1 restore cancelled');
  };
  const { statements: totalStatements, tables, uncreatedTables } = await preflightD1Restore(inputFile, stopOnError, signal);
  throwIfAborted();
  await addTargetReferences(api, tables, uncreatedTables);

  const errors = [];
  let executed = 0;
  let lastProgress = 0;

  const send = async (statements) => {
    throwIfAborted();
    await api.executeStatements([
      { sql: DEFER_FOREIGN_KEYS },
      ...statements.map((statement) => ({ sql: statement.sql })),
    ]);
  };

  const levels = referenceLevels(tables);
  const ordered = new Set(levels.flatMap((level) => [...level]));
  const levelReferencing = levelReferencingTables(tables, levels);

  const reportProgress = () => {
    const now = Date.now();
    if (now - lastProgress >= 750) {
      lastProgress = now;
      info(`Restored ${executed} of ${totalStatements} statements`);
    }
  };

  const reportFailure = (statements, error, hint = '') => {
    const message =
      statements.length == 1
        ? `Statement at ${lineRange(statements)} failed: ${error.message}${hint}`
        : `Statements at ${lineRange(statements)} failed, none of them was applied: ${error.message}${hint}`;
    errors.push(message);
    info(message, 'error');
    if (stopOnError) {
      throw new Error(
        `DBGM-00000 Cloudflare D1 restore stopped at ${lineRange(statements)}${
          executed > 0 ? ` (the ${executed} statements before them were applied)` : ''
        }: ${error.message}${hint}`,
        { cause: error }
      );
    }
  };

  /**
   * Runs the statements `select` picks from one read of the dump, in batches, in dump order.
   *
   * Rows of a table referring to itself (or of tables on a reference cycle) may refer to rows of a
   * later batch. A batch of them refused for a foreign key is set aside - it left nothing behind -
   * and retried once the rest of the pass is in, as long as the retries make progress.
   *
   * Without stopOnError, any other failed batch is split in halves until the failing statements
   * stand alone, so that one bad row (such as a key already in the database) does not cost the
   * rest of its batch.
   */
  const runPass = async (select, label) => {
    if (label) info(label);
    let batch = [];
    let batchBytes = 0;
    let currentObject = null;
    let postponed = [];

    const trySend = async (statements, onFailure) => {
      try {
        await send(statements);
        executed += statements.length;
      } catch (error) {
        if (signal?.aborted) throw error;
        await onFailure(statements, error);
      }
      reportProgress();
    };

    const onFailure = async (statements, error) => {
      if (isForeignKeyError(error) && statements.some((statement) => levelReferencing.has(dataTable(statement)))) {
        postponed.push({ statements, error });
      } else {
        await split(statements, error);
      }
    };

    /** With `final`, the statements are past retrying: nothing is set aside any more. */
    const split = async (statements, error, final = false) => {
      if (stopOnError || statements.length == 1) {
        reportFailure(
          statements,
          error,
          final
            ? ' (rows of a table referring to itself, or of tables referring to each other, refer to rows that could not be restored before them)'
            : ''
        );
        return;
      }
      const middle = Math.ceil(statements.length / 2);
      for (const half of [statements.slice(0, middle), statements.slice(middle)]) {
        await trySend(half, final ? (failed, failure) => split(failed, failure, true) : onFailure);
      }
    };

    const flush = async () => {
      if (batch.length == 0) return;
      const statements = batch;
      batch = [];
      batchBytes = 0;
      await trySend(statements, onFailure);
    };

    for await (const statement of streamSqlStatements(fs.createReadStream(inputFile), {}, signal)) {
      throwIfAborted();
      if (classifyStatement(statement).action != 'run' || !select(statement)) continue;
      if (!label && statement.currentObject && statement.currentObject != currentObject) {
        currentObject = statement.currentObject;
        info(`Restoring ${currentObject}`);
      }
      // Only reached without stopOnError - the preflight refuses such a dump otherwise.
      if (isOversized(statement)) {
        const message = `${oversizedMessage(statement)}; it was left out`;
        errors.push(message);
        info(message, 'error');
        continue;
      }
      const bytes = Buffer.byteLength(statement.sql);
      if (batch.length > 0 && (batch.length >= BATCH_STATEMENTS || batchBytes + bytes > BATCH_BYTES)) {
        await flush();
      }
      batch.push(statement);
      batchBytes += bytes;
    }
    await flush();

    while (postponed.length > 0) {
      const retried = postponed;
      const executedBefore = executed;
      postponed = [];
      for (const { statements } of retried) {
        await trySend(statements, onFailure);
      }
      if (executed == executedBefore) {
        const remaining = postponed;
        postponed = [];
        for (const { statements, error } of remaining) {
          await split(statements, error, true);
        }
      }
    }
  };

  // 1. Tables; 2. their data, parents before children; 3. everything else.
  await runPass((statement) => isTableDefinition(statement), 'Creating tables');
  for (const level of levels) {
    await runPass((statement) => level.has(dataTable(statement)));
  }
  await runPass((statement) => {
    const table = dataTable(statement);
    return table != null && !ordered.has(table);
  });
  await runPass((statement) => !isTableDefinition(statement) && dataTable(statement) == null);

  // Counters and statistics only make sense once the data is in; D1 may refuse to write them, which
  // costs nothing but the information, so each group is tried on its own.
  const groups = new Map();
  let skippedReserved = 0;
  for await (const statement of streamSqlStatements(fs.createReadStream(inputFile), {}, signal)) {
    const { action, group } = classifyStatement(statement);
    if (action == 'reserved') skippedReserved++;
    if (action != 'optional') continue;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(statement);
  }
  for (const [group, statements] of groups) {
    try {
      for (let start = 0; start < statements.length; start += BATCH_STATEMENTS) {
        await send(statements.slice(start, start + BATCH_STATEMENTS));
      }
      executed += statements.length;
    } catch (error) {
      if (signal?.aborted) throw error;
      info(`Left out ${OPTIONAL_GROUP_LABELS[group]}, which Cloudflare D1 did not accept: ${error.message}`, 'warning');
    }
  }
  if (skippedReserved > 0) {
    info(`Left out ${skippedReserved} statements on Cloudflare's reserved _cf_ tables`, 'warning');
  }
  return { statementsExecuted: executed, errors };
}

module.exports = { restoreD1Dump, classifyStatement, referencedTables, referenceLevels };
