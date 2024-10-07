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

function supportsAwsIam() {
  return false;
}

async function getAwsIamToken(params) {
  return null;
}

module.exports = {
  isAuthProxySupported,
  authProxyGetRedirectUrl,
  authProxyGetTokenFromCode,
  startTokenChecking,
  getAuthProxyUrl,
  supportsAwsIam,
  getAwsIamToken,
};
