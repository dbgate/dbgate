function checkLicense() {
  return {
    status: 'ok',
    type: 'community',
  };
}

function checkLicenseKey(key) {
  return {
    status: 'ok',
    type: 'community',
  };
}

function isProApp() {
  return false;
}

module.exports = {
  checkLicense,
  checkLicenseKey,
  isProApp,
};
