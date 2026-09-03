// @ts-check

const stream = require('stream');
const { splitQuery, sqliteSplitterOptions } = require('dbgate-query-splitter');
const { getLogger, extractErrorLogData } = global.DBGATE_PACKAGES['dbgate-tools'];
const { CloudflareD1Api } = require('../cloudflare/CloudflareD1Api');
const { CloudflareD1Error, D1_ERROR_KIND } = require('../cloudflare/CloudflareD1Error');
const { convertD1ResultItem } = require('../cloudflare/d1ResultAdapter');
const { createAxiosTransport } = require('../cloudflare/httpTransport');
const { waitForDrain } = require('../helpers');

const logger = getLogger('sqliteDriver');

/**
 * Statements which control transaction boundaries explicitly.
 *
 * TRANSACTIONS ON CLOUDFLARE D1
 * -----------------------------
 * The D1 REST API is stateless: every call is an independent HTTPS request and there is no
 * session that could hold an open transaction between calls. Cloudflare therefore does not offer
 * interactive transactions. The public REST endpoint is treated as accepting one statement per
 * request, so a script is executed as an ordered sequence of independent HTTPS requests.
 *
 * Consequently this client:
 *   - is exposed by a driver with `supportsTransactions == false`, which removes
 *     Begin/Commit/Rollback from the UI,
 *   - executes split statements sequentially and stops at the first failure; earlier successful
 *     statements remain committed,
 *   - rejects explicit BEGIN/COMMIT/ROLLBACK/SAVEPOINT with a clear message instead of letting
 *     them silently do nothing across separate HTTP requests.
 */
const TRANSACTION_STATEMENT_REGEX = /^\s*(begin|commit|rollback|savepoint|release|end\s+transaction)\b/i;

/**
 * Statements allowed on a read-only connection.
 *
 * The local file mode gets read-only enforcement for free, because better-sqlite3 opens the file
 * with `readonly: true`. The D1 REST API has no equivalent, so the flag would be a promise this
 * client cannot keep. The guard below fails safe: only plain reads pass, everything unrecognized
 * is rejected. `WITH` is deliberately excluded, because SQLite allows `WITH ... INSERT`.
 * PRAGMAs are restricted to the read-only schema introspection calls used by the analyser;
 * assignment and parenthesized setter forms must not pass this client-side guard.
 */
const READ_ONLY_STATEMENT_REGEX = /^\s*(select|explain)\b/i;
const READ_ONLY_PRAGMA_REGEX =
  /^\s*pragma\s+(?:table_info|index_list|index_info|foreign_key_list)\s*\([^()]*\)\s*;?\s*$/i;

/** Strips leading line and block comments so the guards see the actual statement keyword. */
function stripLeadingComments(sql) {
  let rest = String(sql ?? '');
  for (;;) {
    const trimmed = rest.replace(/^\s+/, '');
    if (trimmed.startsWith('--')) {
      const end = trimmed.indexOf('\n');
      if (end < 0) return '';
      rest = trimmed.slice(end + 1);
      continue;
    }
    if (trimmed.startsWith('/*')) {
      const end = trimmed.indexOf('*/');
      if (end < 0) return '';
      rest = trimmed.slice(end + 2);
      continue;
    }
    return trimmed;
  }
}

/**
 * Executes SQLite statements against a Cloudflare D1 database over the Cloudflare REST API.
 *
 * Everything above this class - SQL generation, the dumper, the analyser and the whole data
 * browser - is shared with the local SQLite file mode; only the transport differs.
 *
 */
class CloudflareD1Client {
  /**
   * @param {{
   *   cloudflareAccountId: string,
   *   cloudflareDatabaseId: string,
   *   cloudflareApiToken: string,
   *   cloudflareApiUrl?: string,
   *   isReadOnly?: boolean,
   *   axios?: any,
   * }} connection
   * @param {{ transport?: import('../cloudflare/httpTransport').HttpTransport }} [overrides]
   */
  constructor(connection, overrides = {}) {
    this.isReadOnly = !!connection.isReadOnly;
    this.api = new CloudflareD1Api({
      accountId: connection.cloudflareAccountId,
      databaseId: connection.cloudflareDatabaseId,
      apiToken: connection.cloudflareApiToken,
      apiBaseUrl: connection.cloudflareApiUrl,
      // `connection.axios` is prepared by DbGate's connectUtility and already honours the
      // connection HTTP proxy settings, so no extra HTTP dependency is needed.
      transport: overrides.transport ?? createAxiosTransport(connection.axios),
    });
  }

  /** D1 has no interactive transactions - see TRANSACTION_STATEMENT_REGEX above. */
  get supportsTransactions() {
    return false;
  }

  /**
   * D1 does not expose its underlying SQLite version and rejects sqlite_version().
   * Return a stable product label so connecting does not depend on an unsupported function.
   */
  async getVersion() {
    return {
      version: 'Unknown',
      versionText: 'Cloudflare D1',
    };
  }

  /**
   * Runs a minimal harmless query to verify that the connection settings are usable.
   * On failure it asks the API client for a more specific diagnosis.
   */
  async testConnection() {
    try {
      await this.executeStatements([{ sql: 'select 1' }]);
    } catch (err) {
      const diagnosed = err instanceof CloudflareD1Error ? await this.api.diagnoseFailure(err) : null;
      throw diagnosed ?? err;
    }
  }

  /**
  * @param {{ sql: string, params?: any[] }[]} statements
  */
  async executeStatements(statements) {
    const executableStatements = [];
    for (const statement of statements) {
      const sqlItems = splitQuery(String(statement.sql ?? ''), sqliteSplitterOptions).filter(
        (sql) => stripLeadingComments(sql) != ''
      );
      if (statement.params?.length > 0 && sqlItems.length > 1) {
        throw new CloudflareD1Error('A parameterized Cloudflare D1 query must contain exactly one SQL statement.', {
          kind: D1_ERROR_KIND.unsupported,
        });
      }
      for (const sqlItem of sqlItems) {
        const sql = stripLeadingComments(sqlItem);
        assertNoExplicitTransaction(sql);
        if (this.isReadOnly) {
          assertReadOnlyStatement(sql);
        }
        executableStatements.push({
          sql: sqlItem,
          ...(statement.params?.length > 0 ? { params: statement.params } : {}),
        });
      }
    }
    const items = await this.api.executeStatements(executableStatements);
    return items.map((item) => convertD1ResultItem(item));
  }

  /**
   * @param {string} sql
   * @param {any[]} [params]
   */
  async query(sql, params) {
    const [result] = await this.executeStatements([{ sql, params }]);
    if (!result) {
      return { rows: [], columns: [] };
    }
    return {
      rows: result.rows,
      columns: result.columns,
      rowsAffected: result.rowsAffected,
      lastInsertedId: result.lastInsertedId,
    };
  }

  /**
   * @param {string[]} sqlItems
   * @param {import('dbgate-types').StreamOptions} options
   * @param {string} engine
   */
  async stream(sqlItems, options, engine) {
    try {
      // The REST calls are deliberately sequential to preserve statement order.
      const results = await this.executeStatements(sqlItems.map((sql) => ({ sql })));

      let rowsAffected = 0;
      let hasWrites = false;

      for (const result of results) {
        if (result.isReader) {
          options.recordset(result.columns, { engine });
          for (const row of result.rows) {
            options.row(row);
          }
        } else {
          hasWrites = true;
          rowsAffected += result.rowsAffected;
        }
      }

      if (hasWrites) {
        options.info({
          message: `${rowsAffected} rows affected`,
          time: new Date(),
          severity: 'info',
          rowsAffected,
        });
      }
    } catch (error) {
      logger.error(extractErrorLogData(error), 'DBGM-00000 Stream error');
      options.info({
        message: error.message,
        line: 0,
        time: new Date(),
        severity: 'error',
      });
    }

    options.done();
  }

  /**
   * @param {string[]} sqlItems
   */
  async script(sqlItems) {
    // D1 REST requests are independent, so `useTransaction` cannot be honoured here.
    await this.executeStatements(sqlItems.map((sql) => ({ sql })));
  }

  /**
   * D1 returns whole result sets at once - there is no server side cursor over HTTP, so the rows
   * are buffered and then pushed into the stream, respecting backpressure.
   *
   * @param {string} sql
   * @param {import('dbgate-types').TableInfo} [structure]
   * @param {string} engine
   */
  async readQuery(sql, structure, engine) {
    const pass = new stream.PassThrough({
      objectMode: true,
      highWaterMark: 100,
    });

    const [result] = await this.executeStatements([{ sql }]);

    pass.write({
      __isStreamHeader: true,
      engine,
      ...(structure || { columns: result?.columns ?? [] }),
    });

    this.readQueryTask(result?.rows ?? [], pass);

    return pass;
  }

  async readQueryTask(rows, pass) {
    for (const row of rows) {
      if (!pass.write(row)) {
        await waitForDrain(pass);
      }
    }
    pass.end();
  }

  async close() {
    // Nothing to close - the D1 REST API is stateless.
  }
}

/** @param {string} sql */
function assertNoExplicitTransaction(sql) {
  if (TRANSACTION_STATEMENT_REGEX.test(sql ?? '')) {
    throw new CloudflareD1Error(
      'Cloudflare D1 does not support interactive transactions through the REST API. Every statement is an independent request, so BEGIN/COMMIT/ROLLBACK cannot span statements.',
      { kind: D1_ERROR_KIND.unsupported }
    );
  }
}

/** @param {string} sql statement with leading comments already stripped */
function assertReadOnlyStatement(sql) {
  const statement = sql ?? '';
  if (!READ_ONLY_STATEMENT_REGEX.test(statement) && !READ_ONLY_PRAGMA_REGEX.test(statement)) {
    throw new CloudflareD1Error(
      'This Cloudflare D1 connection is marked read only, so only SELECT, EXPLAIN and supported read-only schema PRAGMAs are allowed.',
      { kind: D1_ERROR_KIND.unsupported }
    );
  }
}

module.exports = CloudflareD1Client;
module.exports.assertNoExplicitTransaction = assertNoExplicitTransaction;
module.exports.assertReadOnlyStatement = assertReadOnlyStatement;
module.exports.stripLeadingComments = stripLeadingComments;
