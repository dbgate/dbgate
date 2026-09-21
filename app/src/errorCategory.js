/**
 * Maps an error to one of a few stable categories, so that a crash can be reported
 * without sending the error itself. Only the error's name, code and a fixed set of
 * well known message patterns are inspected; the message never leaves the machine.
 *
 * Kept in sync with packages/web/src/utility/errorCategory.ts, which does the same for
 * the frontend.
 */

const NETWORK_CODES = [
  'ECONNREFUSED',
  'ECONNRESET',
  'ECONNABORTED',
  'ENOTFOUND',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'EPIPE',
  'EAI_AGAIN',
  'ERR_NETWORK',
  'ERR_CONNECTION_REFUSED',
];

function getErrorCategory(error) {
  try {
    if (error == null) return 'none';

    const name = `${error.name ?? ''}`;
    const code = `${error.code ?? ''}`;
    const message = `${error.message ?? error}`;

    if (code == 'ERR_OUT_OF_MEMORY' || /out of memory|Array buffer allocation failed/i.test(message)) {
      return 'out_of_memory';
    }
    if (/Maximum call stack size exceeded|too much recursion|stack overflow/i.test(message)) return 'stack_overflow';
    if (code == 'ENOSPC') return 'disk_full';
    if (code == 'EACCES' || code == 'EPERM') return 'permission_denied';
    if (code == 'ENOENT') return 'file_not_found';
    if (NETWORK_CODES.includes(code) || /Failed to fetch|NetworkError|Load failed|socket hang up/i.test(message)) {
      return 'network';
    }
    if (name == 'AbortError' || code == 'ABORT_ERR' || code == 'ERR_ABORTED') return 'aborted';
    if (name == 'TimeoutError') return 'timeout';
    if (name == 'QuotaExceededError') return 'storage_quota';
    if (name == 'SecurityError') return 'security';
    if (name == 'SyntaxError') return 'syntax_error';
    if (name == 'ReferenceError') return 'reference_error';
    if (name == 'RangeError') return 'range_error';
    if (name == 'URIError') return 'uri_error';
    if (name == 'TypeError') {
      // The classic "cannot read property of undefined" family, worth separating from other type errors.
      return /undefined|null|is not a function|is not iterable/i.test(message) ? 'null_reference' : 'type_error';
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

module.exports = { getErrorCategory };
