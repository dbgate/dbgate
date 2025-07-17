// only in DbGate Premium

function markUserAsActive(licenseUid, token) {}

async function isLoginLicensed(req, licenseUid) {
  return true;
}

function markLoginAsLoggedOut(licenseUid) {}

const LOGIN_LIMIT_ERROR = '';

module.exports = {
  markUserAsActive,
  isLoginLicensed,
  markLoginAsLoggedOut,
  LOGIN_LIMIT_ERROR,
};
