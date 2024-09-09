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

module.exports = {
  checkLicense,
  checkLicenseKey,
};
