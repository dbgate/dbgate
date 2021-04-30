const crypto = require('crypto');

function timingSafeCheckToken(a, b) {
  if (!a || !b) return false;
  if (a.length != b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

module.exports = timingSafeCheckToken;
