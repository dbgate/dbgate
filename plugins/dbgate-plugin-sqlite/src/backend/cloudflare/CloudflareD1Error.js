// @ts-check

/**
 * Error raised by the Cloudflare D1 HTTP client.
 *
 * SECURITY: instances of this class are the ONLY error objects which may leave the D1 client.
 * Transport level errors (eg. axios errors) must never be rethrown as-is, because their
 * `config.headers` carries the `Authorization: Bearer <API token>` header, and DbGate logs
 * whole error objects (see `extractErrorLogData`) and serializes them into connection error
 * details (see `connectProcess.formatErrorDetail`).
 */
class CloudflareD1Error extends Error {
  /**
   * @param {string} message user facing message, must not contain any secret
   * @param {{ kind?: string, code?: number, httpStatus?: number, sql?: string }} [detail]
   */
  constructor(message, detail = {}) {
    super(message);
    this.name = 'CloudflareD1Error';
    this.kind = detail.kind ?? 'cloudflareApiError';
    if (detail.code != null) this.code = detail.code;
    if (detail.httpStatus != null) this.httpStatus = detail.httpStatus;
    if (detail.sql != null) this.sql = detail.sql;
  }
}

/** Failure categories distinguished by the D1 client. */
const D1_ERROR_KIND = {
  unauthorized: 'unauthorized',
  forbidden: 'forbidden',
  accountNotFound: 'accountNotFound',
  databaseNotFound: 'databaseNotFound',
  cloudflareApiError: 'cloudflareApiError',
  networkError: 'networkError',
  malformedResponse: 'malformedResponse',
  sqlError: 'sqlError',
  unsupported: 'unsupported',
};

module.exports = {
  CloudflareD1Error,
  D1_ERROR_KIND,
};
