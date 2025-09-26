const crypto = require('crypto');

const tokenSecret = crypto.randomUUID();

function getTokenLifetime() {
  return process.env.TOKEN_LIFETIME || '1d';
}

function getTokenSecret() {
  return tokenSecret;
}

function getStaticTokenSecret() {
  // TODO static not fixed
  return '14813c43-a91b-4ad1-9dcd-a81bd7dbb05f';
}

module.exports = {
  getTokenLifetime,
  getTokenSecret,
  getStaticTokenSecret,
};
