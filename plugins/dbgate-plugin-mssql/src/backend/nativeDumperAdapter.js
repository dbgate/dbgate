function prepareQuery(query) {
  const parameters = new Map(
    (query.parameters || []).map(parameter => [parameter.name.toLowerCase(), parameter.value])
  );
  const values = [];
  let sql = '';
  let state = 'normal';
  let blockCommentDepth = 0;

  for (let index = 0; index < query.sql.length; index += 1) {
    const character = query.sql[index];
    const nextCharacter = query.sql[index + 1];

    if (state == 'singleQuote') {
      sql += character;
      if (character == "'") {
        if (nextCharacter == "'") sql += query.sql[++index];
        else state = 'normal';
      }
      continue;
    }

    if (state == 'doubleQuote') {
      sql += character;
      if (character == '"') {
        if (nextCharacter == '"') sql += query.sql[++index];
        else state = 'normal';
      }
      continue;
    }

    if (state == 'bracketIdentifier') {
      sql += character;
      if (character == ']') {
        if (nextCharacter == ']') sql += query.sql[++index];
        else state = 'normal';
      }
      continue;
    }

    if (state == 'lineComment') {
      sql += character;
      if (character == '\r' || character == '\n') state = 'normal';
      continue;
    }

    if (state == 'blockComment') {
      sql += character;
      if (character == '/' && nextCharacter == '*') {
        sql += query.sql[++index];
        blockCommentDepth += 1;
      } else if (character == '*' && nextCharacter == '/') {
        sql += query.sql[++index];
        blockCommentDepth -= 1;
        if (blockCommentDepth == 0) state = 'normal';
      }
      continue;
    }

    if (character == "'") {
      sql += character;
      state = 'singleQuote';
      continue;
    }
    if (character == '"') {
      sql += character;
      state = 'doubleQuote';
      continue;
    }
    if (character == '[') {
      sql += character;
      state = 'bracketIdentifier';
      continue;
    }
    if (character == '-' && nextCharacter == '-') {
      sql += character + query.sql[++index];
      state = 'lineComment';
      continue;
    }
    if (character == '/' && nextCharacter == '*') {
      sql += character + query.sql[++index];
      state = 'blockComment';
      blockCommentDepth = 1;
      continue;
    }

    if (character == '@' && query.sql[index - 1] != '@' && /[A-Za-z_]/.test(nextCharacter || '')) {
      let end = index + 2;
      while (end < query.sql.length && /[A-Za-z0-9_]/.test(query.sql[end])) end += 1;
      const name = query.sql.slice(index + 1, end);
      const parameterName = name.toLowerCase();
      if (parameters.has(parameterName)) {
        sql += '?';
        values.push(parameters.get(parameterName));
        index = end - 1;
        continue;
      }
    }

    sql += character;
  }

  return { sql, values };
}

function queryDescription(sql, timeoutMs) {
  return {
    query_str: sql,
    query_polling: true,
    ...(timeoutMs ? { query_timeout: Math.ceil(timeoutMs / 1000) } : {}),
  };
}

function startQuery(connection, sql, values, timeoutMs) {
  const description = queryDescription(sql, timeoutMs);
  return values.length > 0 ? connection.query(description, values) : connection.query(description);
}

function mapColumns(meta) {
  return (meta || []).map(column => ({
    name: column.name,
    sqlType: column.sqlType,
    nullable: column.nullable,
    length: column.size,
    precision: column.precision,
    scale: column.scale,
  }));
}

function cancelQuery(query) {
  if (!query) return;
  // Native cancellation is supported for paused or polling queries. All
  // dumper queries enable polling, and pausing also stops a streaming query
  // from filling its row queue while cancellation is being processed.
  query.pauseQuery();
  query.cancelQuery(() => {});
}

function quoteIdentifier(name) {
  return `[${String(name).replace(/]/g, ']]')}]`;
}

let stagingTableCounter = 0;
const EMPTY_STRING_BCP_TYPES = new Set(['char', 'varchar', 'nchar', 'nvarchar']);

function createEmptyStringBcpPlan(request) {
  const usedNames = new Set(request.columns.map(column => column.name.toLowerCase()));
  const markers = [];

  for (let columnIndex = 0; columnIndex < request.columns.length; columnIndex++) {
    const column = request.columns[columnIndex];
    if (!EMPTY_STRING_BCP_TYPES.has(String(column.dataType).toLowerCase())) continue;

    let markerName = `__dbgate_empty_${columnIndex}`;
    while (usedNames.has(markerName.toLowerCase())) markerName += '_';
    usedNames.add(markerName.toLowerCase());
    markers.push({ columnIndex, markerName });
  }

  if (markers.length == 0) {
    return {
      request,
      markerDefinitionsSql: '',
      selectColumnSql: request.columns.map(column => quoteIdentifier(column.name)).join(', '),
      repairedRows: 0,
    };
  }

  const markerByColumn = new Map(markers.map(marker => [marker.columnIndex, marker]));
  const markerColumns = markers.map(marker => ({
    name: marker.markerName,
    dataType: 'bit',
    maxLength: 1,
    precision: 1,
    scale: 0,
    nullable: false,
  }));
  let repairedRows = 0;
  const rows = request.rows.map(row => {
    const repaired = Array.from(row);
    let rowRepaired = false;
    for (const marker of markers) {
      const isEmpty = repaired[marker.columnIndex] === '';
      if (isEmpty) {
        // Any non-empty one-character value is valid for all supported
        // character types, including char(1)/nchar(1). The marker, rather
        // than the placeholder itself, determines what is restored.
        repaired[marker.columnIndex] = 'x';
        rowRepaired = true;
      }
      repaired.push(isEmpty);
    }
    if (rowRepaired) repairedRows++;
    return repaired;
  });

  return {
    request: {
      ...request,
      columns: [...request.columns, ...markerColumns],
      rows,
    },
    markerDefinitionsSql: markers.map(marker => `${quoteIdentifier(marker.markerName)} bit NOT NULL`).join(', '),
    selectColumnSql: request.columns
      .map((column, columnIndex) => {
        const marker = markerByColumn.get(columnIndex);
        const columnName = quoteIdentifier(column.name);
        return marker
          ? `CASE WHEN ${quoteIdentifier(marker.markerName)} = 1 THEN '' ELSE ${columnName} END`
          : columnName;
      })
      .join(', '),
    repairedRows,
  };
}

function hasSameBulkTarget(left, right) {
  return (
    left.schemaName === right.schemaName &&
    left.tableName === right.tableName &&
    left.columns.length === right.columns.length &&
    left.columns.every((column, index) => {
      const other = right.columns[index];
      return (
        other &&
        column.name === other.name &&
        column.dataType === other.dataType &&
        column.maxLength === other.maxLength &&
        column.precision === other.precision &&
        column.scale === other.scale &&
        column.nullable === other.nullable &&
        column.identity === other.identity
      );
    })
  );
}

function bindTable(connection, tableName, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      const error = new Error('DBGM-00000 SQL Server operation cancelled');
      error.name = 'AbortError';
      reject(error);
      return;
    }

    connection.tableMgr().bind(tableName, (bulkManager, error) => {
      if (error) reject(error);
      else if (!bulkManager) reject(new Error(`DBGM-00000 Could not bind native bulk table ${tableName}`));
      else resolve(bulkManager);
    });
  });
}

class NativeDumperConnectionAdapter {
  constructor(connection) {
    this.connection = connection;
    this.activeQuery = null;
    this.bulkRestoreTimings = [];
    this.activeBulkInsert = null;
    this.bulkInsertCapabilities = {
      supportsNonAsciiVarchar: true,
      directSqlMaxRows: 500,
    };
  }

  async query(query, signal) {
    const { sql, values } = prepareQuery(query);

    return new Promise((resolve, reject) => {
      let columns = [];
      let currentRow = null;
      let settled = false;
      let rowsAffected = 0;
      const rows = [];
      const nativeQuery = startQuery(this.connection, sql, values, query.timeoutMs);
      this.activeQuery = nativeQuery;

      const cleanup = () => {
        signal?.removeEventListener('abort', handleAbort);
        if (this.activeQuery == nativeQuery) this.activeQuery = null;
      };
      const finish = callback => {
        if (settled) return;
        settled = true;
        cleanup();
        callback();
      };
      const handleAbort = () => {
        cancelQuery(nativeQuery);
        const error = new Error('DBGM-00000 SQL Server operation cancelled');
        error.name = 'AbortError';
        finish(() => reject(error));
      };

      nativeQuery.on('meta', meta => {
        columns = mapColumns(meta);
      });
      nativeQuery.on('row', () => {
        if (currentRow) rows.push(currentRow);
        currentRow = {};
      });
      nativeQuery.on('column', (index, value) => {
        if (currentRow && columns[index]) currentRow[columns[index].name] = value;
      });
      nativeQuery.on('rowcount', count => {
        rowsAffected += Number(count) || 0;
      });
      nativeQuery.on('error', error => finish(() => reject(error)));
      nativeQuery.on('done', () => {
        if (currentRow) rows.push(currentRow);
        finish(() => resolve({ rows, columns, rowsAffected }));
      });

      if (signal?.aborted) handleAbort();
      else signal?.addEventListener('abort', handleAbort, { once: true });
    });
  }

  async execBatch(sql, signal) {
    const result = await this.query({ sql }, signal);
    return { rowsAffected: result.rowsAffected };
  }

  async bulkInsert(request, signal) {
    if (request.rows.length == 0) return { rowsAffected: 0 };

    if (this.activeBulkInsert && !hasSameBulkTarget(this.activeBulkInsert.request, request)) {
      await this.flushBulkInsert(signal);
    }
    if (!this.activeBulkInsert) {
      await this.openBulkInsert(request, signal);
    }

    const session = this.activeBulkInsert;
    const emptyStringPlan = createEmptyStringBcpPlan(request);
    try {
      const loadStartedAt = Date.now();
      const loadResult = await this.executeNativeBcp(session.bulkManager, emptyStringPlan.request, signal);
      session.timing.loadStagingMs += Date.now() - loadStartedAt;
      session.timing.rows += request.rows.length;
      session.timing.chunks += loadResult.chunks;
      session.timing.bcpRows += loadResult.bcpRows;
      session.timing.arrayBindRows += loadResult.arrayBindRows;
      session.timing.repairedEmptyStringRows += emptyStringPlan.repairedRows;
      return { rowsAffected: request.rows.length };
    } catch (error) {
      this.activeBulkInsert = null;
      await this.closeBulkInsertSession(session, false).catch(() => {});
      throw error;
    }
  }

  async openBulkInsert(request, signal) {
    const timing = {
      schemaName: request.schemaName,
      tableName: request.tableName,
      rows: 0,
      chunks: 0,
      bcpRows: 0,
      arrayBindRows: 0,
      repairedEmptyStringRows: 0,
      createStagingMs: 0,
      bindStagingMs: 0,
      loadStagingMs: 0,
      copyToTargetMs: 0,
      dropStagingMs: 0,
      totalMs: 0,
      succeeded: false,
    };
    const tableName = `${quoteIdentifier(request.schemaName)}.${quoteIdentifier(request.tableName)}`;
    // msnodesqlv8 strips identifier quoting from the table name it passes to
    // BCP and does not expose BCPKEEPIDENTITY. One staging heap is therefore
    // retained for all consecutive dump batches targeting the same table.
    const stagingPureName = `__dbgate_restore_${process.pid}_${Date.now()}_${stagingTableCounter++}`;
    const stagingTableName = `${quoteIdentifier(request.schemaName)}.${quoteIdentifier(stagingPureName)}`;
    const columnSql = request.columns.map(column => quoteIdentifier(column.name)).join(', ');
    // Marker columns are created for every BCP-compatible character column,
    // not just columns containing an empty string in the first batch. Later
    // batches can therefore reuse exactly the same bound staging shape.
    const emptyStringPlan = createEmptyStringBcpPlan({ ...request, rows: [] });
    const session = {
      request: { ...request, rows: [] },
      timing,
      tableName,
      stagingTableName,
      columnSql,
      selectColumnSql: emptyStringPlan.selectColumnSql,
      stagingCreated: false,
      bulkManager: null,
      closed: false,
    };

    try {
      const createStartedAt = Date.now();
      await this.execBatch(
        `SELECT TOP (0) ${columnSql} INTO ${stagingTableName} FROM ${tableName}
UNION ALL
SELECT TOP (0) ${columnSql} FROM ${tableName};`,
        signal
      );
      timing.createStagingMs = Date.now() - createStartedAt;
      session.stagingCreated = true;

      if (emptyStringPlan.markerDefinitionsSql) {
        await this.execBatch(`ALTER TABLE ${stagingTableName} ADD ${emptyStringPlan.markerDefinitionsSql};`, signal);
        timing.createStagingMs = Date.now() - createStartedAt;
      }

      const bindStartedAt = Date.now();
      session.bulkManager = await bindTable(this.connection, stagingTableName, signal);
      timing.bindStagingMs = Date.now() - bindStartedAt;
      this.activeBulkInsert = session;
    } catch (error) {
      await this.closeBulkInsertSession(session, false).catch(() => {});
      throw error;
    }
  }

  async flushBulkInsert(signal) {
    const session = this.activeBulkInsert;
    if (!session) return;
    this.activeBulkInsert = null;
    await this.closeBulkInsertSession(session, true, signal);
  }

  async closeBulkInsertSession(session, copyToTarget, signal) {
    if (session.closed) return;
    session.closed = true;
    try {
      if (!copyToTarget || !session.stagingCreated) return;
      const copyStartedAt = Date.now();
      await this.execBatch(
        `INSERT INTO ${session.tableName} (${session.columnSql}) SELECT ${session.selectColumnSql} FROM ${session.stagingTableName};`,
        signal
      );
      session.timing.copyToTargetMs = Date.now() - copyStartedAt;
      session.timing.succeeded = true;
    } finally {
      if (session.stagingCreated) {
        // Cleanup must also run after cancellation. Do not pass the already
        // aborted signal; failure here must not hide the original restore error.
        const dropStartedAt = Date.now();
        await this.execBatch(`DROP TABLE IF EXISTS ${session.stagingTableName};`).catch(() => {});
        session.timing.dropStagingMs = Date.now() - dropStartedAt;
      }
      session.timing.totalMs =
        session.timing.createStagingMs +
        session.timing.bindStagingMs +
        session.timing.loadStagingMs +
        session.timing.copyToTargetMs +
        session.timing.dropStagingMs;
      this.bulkRestoreTimings.push(session.timing);
    }
  }

  async executeNativeBcp(bulkManager, request, signal) {
    // Keep each native operation bounded while retaining one set-based
    // transfer into the target table. The public TableBulkOpMgr API is used
    // here because it owns the native BCP statement lifecycle.
    const chunkSize = 1000;
    bulkManager.setBatchSize(chunkSize);
    let rowsAffected = 0;
    let bcpRows = 0;
    let arrayBindRows = 0;
    let chunks = 0;
    for (let offset = 0; offset < request.rows.length; offset += chunkSize) {
      if (signal?.aborted) {
        const error = new Error('DBGM-00000 SQL Server operation cancelled');
        error.name = 'AbortError';
        throw error;
      }
      const rows = request.rows
        .slice(offset, offset + chunkSize)
        .map(row => Object.fromEntries(request.columns.map((column, columnIndex) => [column.name, row[columnIndex]])));
      // Supported character columns have already had empty strings replaced
      // by a marked placeholder. Keep array binding as a correctness fallback
      // for legacy text/ntext or an unexpected value shape.
      const hasEmptyString = rows.some(row => Object.values(row).some(value => value === ''));
      bulkManager.setUseBcp(!hasEmptyString);
      await bulkManager.promises.insert(rows);
      if (hasEmptyString) arrayBindRows += rows.length;
      else bcpRows += rows.length;
      rowsAffected += rows.length;
      chunks++;
    }
    return { rowsAffected, chunks, bcpRows, arrayBindRows };
  }

  getBulkRestoreTimings() {
    return this.bulkRestoreTimings.map(timing => ({ ...timing }));
  }

  async *stream(query, options = {}) {
    const { sql, values } = prepareQuery(query);
    const highWaterMark = Math.max(1, options.batchSize || 50);
    const lowWaterMark = Math.floor(highWaterMark / 2);
    const queue = [];
    const waiters = [];
    let columns = [];
    let currentRow = null;
    let completed = false;
    let failure = null;
    let cancelled = false;
    const nativeQuery = startQuery(this.connection, sql, values, query.timeoutMs);
    this.activeQuery = nativeQuery;

    const wake = () => {
      while (waiters.length > 0) waiters.shift()();
    };
    const enqueueCurrentRow = () => {
      if (!currentRow) return;
      queue.push(currentRow);
      currentRow = null;
      if (queue.length >= highWaterMark && !nativeQuery.isPaused()) nativeQuery.pauseQuery();
      wake();
    };
    const handleAbort = () => {
      cancelled = true;
      cancelQuery(nativeQuery);
      wake();
    };

    nativeQuery.on('meta', meta => {
      columns = mapColumns(meta);
    });
    nativeQuery.on('row', () => {
      enqueueCurrentRow();
      currentRow = {};
    });
    nativeQuery.on('column', (index, value) => {
      if (currentRow && columns[index]) currentRow[columns[index].name] = value;
    });
    nativeQuery.on('error', error => {
      failure = error;
      completed = true;
      wake();
    });
    nativeQuery.on('done', () => {
      enqueueCurrentRow();
      completed = true;
      wake();
    });

    if (options.signal?.aborted) handleAbort();
    else options.signal?.addEventListener('abort', handleAbort, { once: true });

    try {
      while (!completed || queue.length > 0) {
        if (cancelled) {
          const error = new Error('DBGM-00000 SQL Server operation cancelled');
          error.name = 'AbortError';
          throw error;
        }
        if (failure) throw failure;
        if (queue.length == 0) {
          await new Promise(resolve => waiters.push(resolve));
          continue;
        }

        const row = queue.shift();
        if (nativeQuery.isPaused() && queue.length <= lowWaterMark) nativeQuery.resumeQuery();
        yield row;
      }
      if (failure) throw failure;
    } finally {
      options.signal?.removeEventListener('abort', handleAbort);
      if (!completed) cancelQuery(nativeQuery);
      if (this.activeQuery == nativeQuery) this.activeQuery = null;
    }
  }

  async getTransactionStatus(signal) {
    const result = await this.query(
      { sql: 'SELECT @@TRANCOUNT AS transactionCount, XACT_STATE() AS transactionState' },
      signal
    );
    const row = result.rows[0];
    if (!row || Number(row.transactionCount) == 0) return 'idle';
    return Number(row.transactionState) == -1 ? 'failed' : 'in-transaction';
  }

  async cancel() {
    cancelQuery(this.activeQuery);
  }
}

function fromNativeConnection(connection) {
  return new NativeDumperConnectionAdapter(connection);
}

module.exports = {
  fromNativeConnection,
  NativeDumperConnectionAdapter,
  prepareQuery,
};
