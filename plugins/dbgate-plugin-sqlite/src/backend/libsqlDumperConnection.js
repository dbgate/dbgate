const { fromBetterSqlite3 } = require('dbgate-sqlite-dumper/better-sqlite3');

/**
 * `libsql` returns BLOB values - and anything read as bytes, which is how dbgate-sqlite-dumper
 * reads text so that its exact bytes survive - as ArrayBuffer, where better-sqlite3 returns
 * Buffer. Everything else about the two APIs is the same.
 */
function normalizeRow(row) {
  for (const key of Object.keys(row)) {
    const value = row[key];
    if (value instanceof ArrayBuffer) {
      row[key] = Buffer.from(value);
    }
  }
  return row;
}

/**
 * Adapts an open `libsql` Database to the dbgate-sqlite-dumper connection interface.
 *
 * libsql's synchronous API mirrors better-sqlite3's, so the bundled better-sqlite3 adapter is
 * reused, with two differences:
 * - binary values are converted from ArrayBuffer to Buffer (see normalizeRow); without that every
 *   value read as bytes would be written into the dump as the text "[object ArrayBuffer]";
 * - there is no setDefensive(): libsql does not implement unsafeMode(), and it does not turn
 *   SQLITE_DBCONFIG_DEFENSIVE on, so restoring a dump with virtual tables needs no toggling.
 */
function createLibsqlDumperConnection(client) {
  const base = fromBetterSqlite3(client);
  return {
    ...base,
    async query(query, signal) {
      const result = await base.query(query, signal);
      return { ...result, rows: result.rows.map(normalizeRow) };
    },
    stream(query, options) {
      const rows = base.stream(query, options);
      return {
        async *[Symbol.asyncIterator]() {
          for await (const row of rows) {
            yield normalizeRow(row);
          }
        },
      };
    },
    setDefensive: undefined,
  };
}

module.exports = createLibsqlDumperConnection;
