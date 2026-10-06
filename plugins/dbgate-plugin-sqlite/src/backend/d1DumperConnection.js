const { OperationCancelledError } = require('dbgate-sqlite-dumper');
const { d1ConnectionFeatures } = require('dbgate-sqlite-dumper/d1');
const { extractColumnNames, extractRowArrays } = require('./cloudflare/d1ResultAdapter');

/**
 * D1 refuses sqlite_version() (see CloudflareD1Client.getVersion), which dbgate-sqlite-dumper reads
 * first. The dumper uses the version only to decide which catalog features it may rely on, and D1
 * runs a current SQLite, so it is told this release when D1 does not answer.
 */
const ASSUMED_D1_SQLITE_VERSION = '3.45.0';

const VERSION_QUERY_REGEX = /^\s*select\s+sqlite_version\(\)\s+as\s+"?(\w+)"?\s*$/i;

function throwIfAborted(signal) {
  if (signal?.aborted) throw new OperationCancelledError();
}

function toResult(item) {
  const columns = extractColumnNames(item);
  const rows = extractRowArrays(item).map((values) => {
    const row = {};
    columns.forEach((column, index) => {
      row[column] = values[index] ?? null;
    });
    return row;
  });
  return { rows, columns };
}

/**
 * Adapts DbGate's Cloudflare D1 REST client to the dbgate-sqlite-dumper connection interface.
 *
 * The dumper ships its own D1 adapter (`fromD1Http`), but it calls Cloudflare with the global
 * fetch. Going through DbGate's CloudflareD1Api instead keeps the connection's HTTP proxy settings
 * and DbGate's classified, token-free CloudflareD1Error messages. The restrictions of D1 - no
 * transactions, no pragma functions, JSON results, reserved `_cf_` tables - are declared with the
 * dumper's own `d1ConnectionFeatures()`, so the dump is read exactly as `fromD1Http` would read it.
 *
 * A D1 request cannot be interrupted once sent; cancellation takes effect between requests, and a
 * dump makes one request per page of rows.
 *
 * @param {import('./cloudflare/CloudflareD1Api').CloudflareD1Api} api
 * @param {{ pageSize?: number }} [options]
 */
function createD1DumperConnection(api, options = {}) {
  const run = async (queries, signal) => {
    throwIfAborted(signal);
    const items = await api.executeStatements(
      queries.map((query) => ({ sql: query.sql, params: query.parameters ? [...query.parameters] : undefined }))
    );
    throwIfAborted(signal);
    return items.map(toResult);
  };

  return {
    features: d1ConnectionFeatures(options.pageSize),

    async query(query, signal) {
      const version = VERSION_QUERY_REGEX.exec(query.sql);
      if (version) {
        try {
          const [result] = await run([query], signal);
          if (result.rows.length > 0) return result;
        } catch (error) {
          if (error instanceof OperationCancelledError) throw error;
        }
        return { rows: [{ [version[1]]: ASSUMED_D1_SQLITE_VERSION }], columns: [version[1]] };
      }
      const [result] = await run([query], signal);
      return result;
    },

    async queryBatch(queries, signal) {
      return queries.length == 0 ? [] : run(queries, signal);
    },

    // D1 returns a result whole; the dumper reads table data in pages (`pagedReadSize`) through
    // query(), so this is only a fallback.
    stream(query, streamOptions) {
      const connection = this;
      return {
        async *[Symbol.asyncIterator]() {
          const { rows } = await connection.query(query, streamOptions?.signal);
          yield* rows;
        },
      };
    },

    describeError(error) {
      if (!(error instanceof Error)) return undefined;
      const code = /\b(SQLITE_[A-Z_]+)\b/.exec(error.message)?.[1];
      return { ...(code ? { code } : {}), message: error.message };
    },

    async cancel() {},
  };
}

module.exports = createD1DumperConnection;
