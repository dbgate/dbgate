function isAzureAuthSupported() {
  return false;
}

async function azureGetRedirectAuthUrl(options) {
  return null;
}

async function azureGetAuthTokenFromCode(options) {
  return null;
}

module.exports = {
  isAzureAuthSupported,
  azureGetRedirectAuthUrl,
  azureGetAuthTokenFromCode,
};
