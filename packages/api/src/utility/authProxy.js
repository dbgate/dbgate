function isAuthProxySupported() {
  return false;
}

async function authProxyGetRedirectUrl(options) {
  return null;
}

async function authProxyGetTokenFromCode(options) {
  return null;
}

module.exports = {
  isAuthProxySupported,
  authProxyGetRedirectUrl,
  authProxyGetTokenFromCode,
};
