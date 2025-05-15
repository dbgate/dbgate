const axios = require('axios');
const { getExternalParamsWithLicense } = require('./authProxy');

const DBGATE_IDENTITY_URL = process.env.LOCAL_DBGATE_IDENTITY
  ? 'http://localhost:3001'
  : process.env.DEVWEB || process.env.DEVMODE
  ? 'https://identity.dbgate.udolni.net'
  : 'https://identity.dbgate.io';

const DBGATE_CLOUD_URL = process.env.LOCAL_DBGATE_CLOUD
  ? 'http://localhost:3109'
  : process.env.DEVWEB || process.env.DEVMODE
  ? 'https://cloud.dbgate.udolni.net'
  : 'https://cloud.dbgate.io';

async function createDbGateIdentitySession(client) {
  const resp = await axios.default.post(
    `${DBGATE_IDENTITY_URL}/api/create-session`,
    {
      client,
    },
    getExternalParamsWithLicense()
  );
  return resp.data.sid;
}

function getIdentitySigninUrl(sid) {
  return `${DBGATE_IDENTITY_URL}/signin/${sid}`;
}

module.exports = {
  createDbGateIdentitySession,
  getIdentitySigninUrl,
};
