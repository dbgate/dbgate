const crypto = require('crypto');

const tokenSecret = crypto.randomUUID();

function getTokenLifetime() {
  return process.env.TOKEN_LIFETIME || '1d';
}

function getTokenSecret() {
  return tokenSecret;
}

/**
 * Signing secret for tokens that are NOT API session tokens (for example the short-lived grant
 * that lets a user run an autoExecute team file they may not read).
 *
 * Derived from the per-process session secret, so it is random per process and never leaves the
 * server - a constant compiled into the build would be public, since this is an open-source
 * product, and anyone could then mint their own tokens. The derivation is domain-separated by
 * purpose so that a token minted for one purpose can never verify as a token of another, and in
 * particular so that such a token can never be presented as an API session token.
 *
 * @param {string} purpose
 */
function getPurposeTokenSecret(purpose) {
  return crypto.createHmac('sha256', tokenSecret).update(`dbgate-token-purpose:${purpose}`).digest('hex');
}

module.exports = {
  getTokenLifetime,
  getTokenSecret,
  getPurposeTokenSecret,
};
