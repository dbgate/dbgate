// only in DbGate Premium

function markUserAsActive(licenseUid) {}

async function isLoginLicensed(req, licenseUid) {
  return true;
}

const LOGIN_LIMIT_ERROR = '';

module.exports = {
  markUserAsActive,
  isLoginLicensed,
  LOGIN_LIMIT_ERROR,
};
