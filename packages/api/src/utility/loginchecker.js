// only in DbGate Premium

function markUserAsActive(licenseUid, token) {}

async function isLoginLicensed(req, licenseUid) {
  return true;
}

function markLoginAsLoggedOut(licenseUid) {}

const LOGIN_LIMIT_ERROR = '';

function getLoggedUserCount() {
  return 0;
}

module.exports = {
  markUserAsActive,
  isLoginLicensed,
  markLoginAsLoggedOut,
  getLoggedUserCount,
  LOGIN_LIMIT_ERROR,
};
