const crypto = require('crypto');

const tokenSecret = crypto.randomUUID();

export function getTokenLifetime() {
  return process.env.TOKEN_LIFETIME || '1d';
}

export function getTokenSecret() {
  return tokenSecret;
}
