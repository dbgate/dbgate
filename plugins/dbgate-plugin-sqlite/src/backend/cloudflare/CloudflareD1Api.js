// @ts-check

const { CloudflareD1Error, D1_ERROR_KIND } = require('./CloudflareD1Error');

const DEFAULT_API_BASE_URL = 'https://api.cloudflare.com/client/v4';

/**
 * Focused HTTP client for the Cloudflare D1 REST API.
 *
 * Responsibilities: URL construction, Authorization/Content-Type headers, request body,
 * response parsing, Cloudflare envelope handling and error classification.
 * It deliberately knows nothing about DbGate - conversion of D1 responses into DbGate result
 * sets lives in `d1ResultAdapter.js`.
 *
 * The `/raw` endpoint is used instead of `/query`, because it returns column names separately
 * and rows as arrays, which maps directly onto the DbGate `{ columns, rows }` result model
 * (and is cheaper to transfer).
 */
class CloudflareD1Api {
  /**
   * @param {{
   *   accountId: string,
   *   databaseId?: string,
   *   apiToken: string,
   *   apiBaseUrl?: string,
   *   transport: import('./httpTransport').HttpTransport,
   * }} options
   */
  constructor({ accountId, databaseId, apiToken, apiBaseUrl, transport }) {
    this.accountId = String(accountId ?? '').trim();
    this.databaseId = String(databaseId ?? '').trim();
    // Kept private-ish: never spread this object into logs or errors.
    this.apiToken = String(apiToken ?? '').trim();
    this.apiBaseUrl = normalizeBaseUrl(apiBaseUrl);
    this.transport = transport;

    if (!this.accountId) {
      throw new CloudflareD1Error('Cloudflare Account ID is not configured', {
        kind: D1_ERROR_KIND.accountNotFound,
      });
    }
    if (!this.apiToken) {
      throw new CloudflareD1Error('Cloudflare API token is not configured', {
        kind: D1_ERROR_KIND.unauthorized,
      });
    }
  }

  /** Base URL of the account's D1 database collection. */
  get databasesUrl() {
    return `${this.apiBaseUrl}/accounts/${encodeURIComponent(this.accountId)}/d1/database`;
  }

  /** Base URL of the D1 database resource. */
  get databaseUrl() {
    if (!this.databaseId) {
      throw new CloudflareD1Error('No Cloudflare D1 database is selected', {
        kind: D1_ERROR_KIND.databaseNotFound,
      });
    }
    return `${this.databasesUrl}/${encodeURIComponent(this.databaseId)}`;
  }

  /** URL of the endpoint returning columns and rows separately. */
  get rawQueryUrl() {
    return `${this.databaseUrl}/raw`;
  }

  /** URL of the endpoint returning rows as objects. Not used for querying, kept for completeness. */
  get queryUrl() {
    return `${this.databaseUrl}/query`;
  }

  /** @returns {object} request headers, including the Bearer authorization */
  buildHeaders() {
    return {
      Authorization: `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  /**
   * Lists all D1 databases accessible to the token. Cloudflare paginates this endpoint, so the
   * account connection must not assume that the first page is the complete database model.
   *
   * @returns {Promise<{ name: string, uuid: string }[]>}
   */
  async listDatabases() {
    const databases = [];
    const requestedPageSize = 100;
    let page = 1;

    for (;;) {
      const response = await this.transport({
        method: 'GET',
        url: `${this.databasesUrl}?page=${page}&per_page=${requestedPageSize}`,
        headers: this.buildHeaders(),
      });
      const envelope = this.unwrapEnvelope(response, undefined, true);

      for (const database of envelope.result) {
        if (!database || typeof database.name != 'string' || typeof database.uuid != 'string') {
          throw new CloudflareD1Error('Cloudflare API returned a malformed D1 database list', {
            kind: D1_ERROR_KIND.malformedResponse,
            httpStatus: response?.status,
          });
        }
        databases.push(database);
      }

      const resultInfo = envelope.result_info ?? {};
      const pageSize = Number(resultInfo.per_page) || requestedPageSize;
      const totalCount = resultInfo.total_count == null ? null : Number(resultInfo.total_count);
      if (
        envelope.result.length < pageSize ||
        (totalCount != null && Number.isFinite(totalCount) && databases.length >= totalCount)
      ) {
        break;
      }
      page += 1;
    }

    return databases;
  }

  /**
   * Executes one or more statements against the D1 `/raw` endpoint.
   *
   * Each statement is posted separately using the broadly supported `{ sql, params }` request
   * shape. Requests are awaited in order so later statements never overtake earlier ones.
   *
   * @param {{ sql: string, params?: any[] }[]} statements
   * @returns {Promise<import('./d1ResultAdapter').D1RawResultItem[]>}
   */
  async executeStatements(statements) {
    if (!statements || statements.length == 0) {
      return [];
    }

    const resultItems = [];
    for (const statement of statements) {
      const envelope = await this.postRaw(buildStatementBody(statement));
      resultItems.push(...normalizeResultItems(envelope, [statement]));
    }

    return resultItems;
  }

  /**
   * @param {string} sql
   * @param {any[]} [params]
   * @returns {Promise<import('./d1ResultAdapter').D1RawResultItem>}
   */
  async executeSingleStatement(sql, params) {
    const items = await this.executeStatements([{ sql, params }]);
    return items[0];
  }

  /**
   * Sends a body to the `/raw` endpoint and unwraps the Cloudflare envelope.
   * @param {any} body
   */
  async postRaw(body) {
    const response = await this.transport({
      method: 'POST',
      url: this.rawQueryUrl,
      headers: this.buildHeaders(),
      body,
    });
    return this.unwrapEnvelope(response, extractFirstSql(body));
  }

  /**
   * Validates the Cloudflare response envelope and returns it, or throws a classified error.
   * @param {{ status: number, data: any }} response
   * @param {string} [sql]
   * @param {boolean} [isDatabaseList]
   */
  unwrapEnvelope(response, sql, isDatabaseList = false) {
    const { status, data } = response ?? {};

    if (data == null || typeof data != 'object' || Array.isArray(data)) {
      throw new CloudflareD1Error(
        `Cloudflare API returned an unexpected response (HTTP ${status}) which is not a JSON object`,
        { kind: D1_ERROR_KIND.malformedResponse, httpStatus: status }
      );
    }

    const errors = Array.isArray(data.errors) ? data.errors : [];
    if (status >= 400 || data.success === false || errors.length > 0) {
      throw buildApiError({ status, errors, sql, isDatabaseList });
    }

    if (!Array.isArray(data.result)) {
      throw new CloudflareD1Error(`Cloudflare API returned a response without a "result" array (HTTP ${status})`, {
        kind: D1_ERROR_KIND.malformedResponse,
        httpStatus: status,
      });
    }

    return data;
  }

  /**
   * Best-effort classification of a connection failure, used when a test/initial query fails.
   * Performs read-only probes to tell apart an invalid token, an inaccessible account and a
   * missing database. Never throws - returns a replacement error, or null when nothing more
   * specific could be determined.
   *
   * @param {CloudflareD1Error} originalError
   * @returns {Promise<CloudflareD1Error|null>}
   */
  async diagnoseFailure(originalError) {
    const kind = originalError?.kind;
    const isRoutingProblem =
      kind == D1_ERROR_KIND.unauthorized ||
      kind == D1_ERROR_KIND.forbidden ||
      kind == D1_ERROR_KIND.accountNotFound ||
      kind == D1_ERROR_KIND.databaseNotFound ||
      kind == D1_ERROR_KIND.cloudflareApiError;
    if (!isRoutingProblem) {
      return null;
    }

    const tokenProbe = await this.probe(`${this.apiBaseUrl}/user/tokens/verify`);
    if (tokenProbe.status == 401 || tokenProbe.status == 403) {
      return new CloudflareD1Error(
        'The Cloudflare API token is invalid, expired or revoked. Create a new token with the "D1" permission and try again.',
        { kind: D1_ERROR_KIND.unauthorized, httpStatus: tokenProbe.status }
      );
    }

    const databaseProbe = await this.probe(this.databaseUrl);
    if (databaseProbe.status == 403) {
      return new CloudflareD1Error(
        'The API token does not have the D1 permission. Edit the token and grant "Account / D1 / Edit" (or "Read" for a read-only connection).',
        { kind: D1_ERROR_KIND.forbidden, httpStatus: databaseProbe.status }
      );
    }

    // Reading generic account details requires a permission which a normal Account/D1 token does
    // not necessarily have. Use this probe only to distinguish a missing account from a missing
    // database; its 403 response is inconclusive and must not replace the D1 routing error.
    const accountProbe = await this.probe(`${this.apiBaseUrl}/accounts/${encodeURIComponent(this.accountId)}`);
    if (accountProbe.status == 404 || accountProbe.status == 400) {
      return new CloudflareD1Error(
        `Cloudflare Account ID "${this.accountId}" was not found. Check the Account ID on the Cloudflare dashboard overview page.`,
        { kind: D1_ERROR_KIND.accountNotFound, httpStatus: accountProbe.status }
      );
    }
    if (databaseProbe.status == 404) {
      return new CloudflareD1Error(
        `D1 database "${this.databaseId}" was not found in account "${this.accountId}". Check the Database ID (wrangler d1 list, or the D1 dashboard).`,
        { kind: D1_ERROR_KIND.databaseNotFound, httpStatus: databaseProbe.status }
      );
    }

    return null;
  }

  /**
   * Read-only GET probe used by `diagnoseFailure`. Swallows every failure.
   * @param {string} url
   * @returns {Promise<{ status: number }>}
   */
  async probe(url) {
    try {
      const response = await this.transport({ method: 'GET', url, headers: this.buildHeaders() });
      return { status: response?.status ?? 0 };
    } catch (err) {
      return { status: 0 };
    }
  }
}

/** @param {string} [apiBaseUrl] */
function normalizeBaseUrl(apiBaseUrl) {
  const trimmed = String(apiBaseUrl ?? '').trim();
  if (!trimmed) return DEFAULT_API_BASE_URL;
  return trimmed.replace(/\/+$/, '');
}

/** @param {{ sql: string, params?: any[] }} statement */
function buildStatementBody(statement) {
  const body = { sql: statement.sql };
  if (statement.params && statement.params.length > 0) {
    // @ts-ignore
    body.params = statement.params;
  }
  return body;
}

/** @param {any} body */
function extractFirstSql(body) {
  if (!body) return undefined;
  if (body.sql) return body.sql;
  return undefined;
}

/**
 * Cloudflare returns one result item per executed statement. Validates the shape of each item
 * and surfaces per-statement failures.
 * @param {any} envelope
 * @param {{ sql: string }[]} statements
 * @returns {import('./d1ResultAdapter').D1RawResultItem[]}
 */
function normalizeResultItems(envelope, statements) {
  return envelope.result.map((item, index) => {
    if (item == null || typeof item != 'object') {
      throw new CloudflareD1Error('Cloudflare API returned a malformed D1 result item', {
        kind: D1_ERROR_KIND.malformedResponse,
      });
    }
    if (item.success === false) {
      throw new CloudflareD1Error(item.error ? String(item.error) : 'D1 statement failed', {
        kind: D1_ERROR_KIND.sqlError,
        sql: statements[index]?.sql,
      });
    }
    return item;
  });
}

/**
 * Maps an HTTP status + Cloudflare error list onto a classified, user friendly error.
 * The API token is never part of the produced message.
 * @param {{ status: number, errors: any[], sql?: string, isDatabaseList?: boolean }} param0
 */
function buildApiError({ status, errors, sql, isDatabaseList = false }) {
  const primary = errors[0] ?? {};
  const code = typeof primary.code == 'number' ? primary.code : undefined;
  const cloudflareMessage = errors
    .map((x) => (x && x.message ? String(x.message) : null))
    .filter((x) => x)
    .join('; ');

  const detail = { code, httpStatus: status, sql };

  // 9109 "Unauthorized to access requested resource" means the token exists but lacks the
  // permission, so it must be checked before the invalid-token case.
  if (status == 403 || code == 9109) {
    return new CloudflareD1Error(
      `The Cloudflare API token is not authorized for ${
        isDatabaseList ? 'the D1 databases in this account' : 'this D1 database'
      } (HTTP ${status}). The token needs the "Account / D1" permission.${suffix(
        cloudflareMessage
      )}`,
      { ...detail, kind: D1_ERROR_KIND.forbidden }
    );
  }

  if (status == 401 || code == 10000) {
    return new CloudflareD1Error(
      `Cloudflare rejected the API token (HTTP ${status}). Check that the D1 API token is valid and not expired.${suffix(
        cloudflareMessage
      )}`,
      { ...detail, kind: D1_ERROR_KIND.unauthorized }
    );
  }

  // 7000 "No route for that URI" / 7003 "Could not route ... perhaps your object identifier is
  // invalid" are what Cloudflare returns for a wrong Account ID or Database ID.
  if (status == 404 || code == 7000 || code == 7003) {
    return new CloudflareD1Error(
      isDatabaseList
        ? `Cloudflare could not list D1 databases for this account (HTTP ${status}). Check the Account ID and the token's account scope.${suffix(
            cloudflareMessage
          )}`
        : `Cloudflare could not resolve the D1 database (HTTP ${status}). Check the Account ID and the D1 Database ID.${suffix(
            cloudflareMessage
          )}`,
      { ...detail, kind: isDatabaseList ? D1_ERROR_KIND.accountNotFound : D1_ERROR_KIND.databaseNotFound }
    );
  }

  if (cloudflareMessage) {
    // D1 reports SQL problems through the standard envelope, eg. 'no such table: foo'.
    return new CloudflareD1Error(cloudflareMessage, {
      ...detail,
      kind: status == 400 ? D1_ERROR_KIND.sqlError : D1_ERROR_KIND.cloudflareApiError,
    });
  }

  return new CloudflareD1Error(`Cloudflare API request failed with HTTP ${status}`, {
    ...detail,
    kind: D1_ERROR_KIND.cloudflareApiError,
  });
}

/** @param {string} message */
function suffix(message) {
  return message ? ` Cloudflare says: ${message}` : '';
}

module.exports = {
  CloudflareD1Api,
  DEFAULT_API_BASE_URL,
  normalizeBaseUrl,
  buildApiError,
};
