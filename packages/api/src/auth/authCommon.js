const crypto = require('crypto');

const tokenSecret = crypto.randomUUID();

function getTokenLifetime() {
  return process.env.TOKEN_LIFETIME || '1d';
}

function getTokenSecret() {
  return tokenSecret;
}

module.exports = {
  getTokenLifetime,
  getTokenSecret,
};
