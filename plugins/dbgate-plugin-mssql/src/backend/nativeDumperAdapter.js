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

class NativeDumperConnectionAdapter {
  constructor(connection) {
    this.connection = connection;
    this.activeQuery = null;
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

module.exports = { fromNativeConnection, NativeDumperConnectionAdapter, prepareQuery };
