const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { datadir } = require('../utility/directories');

let tokenSecret = null;

function getTokenLifetime() {
  return process.env.TOKEN_LIFETIME || '1d';
}

function getTokenSecret() {
  if (!tokenSecret) {
    const tokenFile = path.join(datadir(), 'token.secret');
    try {
      if (fs.existsSync(tokenFile)) {
        tokenSecret = fs.readFileSync(tokenFile, 'utf8');
      } else {
        tokenSecret = crypto.randomUUID();
        fs.writeFileSync(tokenFile, tokenSecret);
      }
    } catch (err) {
      // Fallback to random UUID if file operations fail
      tokenSecret = crypto.randomUUID();
    }
  }
  return tokenSecret;
}

module.exports = {
  getTokenLifetime,
  getTokenSecret,
};
