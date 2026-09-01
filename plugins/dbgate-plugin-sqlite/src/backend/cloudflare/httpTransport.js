// @ts-check

const { CloudflareD1Error, D1_ERROR_KIND } = require('./CloudflareD1Error');

/**
 * @typedef {(request: { method: 'GET'|'POST', url: string, headers: object, body?: any }) =>
 *   Promise<{ status: number, data: any }>} HttpTransport
 */

/**
 * Wraps the axios instance prepared by DbGate (`connection.axios`, which already honours the
 * connection HTTP proxy settings) into a minimal transport.
 *
 * All axios failures are converted here into `CloudflareD1Error`, so that no axios error object -
 * which carries the Authorization header inside `error.config` - can ever escape into DbGate
 * logs or error details.
 *
 * @param {any} axiosInstance
 * @returns {HttpTransport}
 */
function createAxiosTransport(axiosInstance) {
  if (!axiosInstance) {
    throw new CloudflareD1Error('HTTP client is not available for the Cloudflare D1 connection', {
      kind: D1_ERROR_KIND.networkError,
    });
  }

  return async ({ method, url, headers, body }) => {
    try {
      const response = await axiosInstance.request({
        method,
        url,
        headers,
        data: body,
        // Cloudflare reports application level problems in the response envelope, so we want to
        // inspect 4xx/5xx bodies instead of letting axios throw.
        validateStatus: () => true,
        responseType: 'json',
      });
      return { status: response.status, data: response.data };
    } catch (err) {
      throw new CloudflareD1Error(`Cannot reach the Cloudflare API: ${describeTransportFailure(err)}`, {
        kind: D1_ERROR_KIND.networkError,
      });
    }
  };
}

/**
 * Extracts a short, secret-free description of a transport failure.
 * Only the error code and message are used - never the request config.
 * @param {any} err
 */
function describeTransportFailure(err) {
  if (!err) return 'unknown network error';
  if (err.code) return `${err.code}`;
  if (err.message) return String(err.message);
  return 'unknown network error';
}

module.exports = {
  createAxiosTransport,
  describeTransportFailure,
};
