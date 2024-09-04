function isAuthProxySupported() {
  return false;
}

async function authProxyGetRedirectUrl(options) {
  return null;
}

async function authProxyGetTokenFromCode(options) {
  return null;
}

function startTokenChecking(sid, callback) {}

function getAuthProxyUrl() {
  return 'https://auth.dbgate.eu';
}

module.exports = {
  isAuthProxySupported,
  authProxyGetRedirectUrl,
  authProxyGetTokenFromCode,
  startTokenChecking,
  getAuthProxyUrl,
};
