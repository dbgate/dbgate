const axios = require('axios');
const { getExternalParamsWithLicense } = require('./authProxy');
const { getLogger, extractErrorLogData } = require('dbgate-tools');

const logger = getLogger('cloudIntf');

const DBGATE_IDENTITY_URL = process.env.LOCAL_DBGATE_IDENTITY
  ? 'http://localhost:3103'
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
  return {
    sid: resp.data.sid,
    url: `${DBGATE_IDENTITY_URL}/api/signin/${resp.data.sid}`,
  };
}

function startCloudTokenChecking(sid, callback) {
  const started = Date.now();
  const interval = setInterval(async () => {
    if (Date.now() - started > 60 * 1000) {
      clearInterval(interval);
      return;
    }

    try {
      const resp = await axios.default.get(
        `${DBGATE_IDENTITY_URL}/api/get-token/${sid}`,
        getExternalParamsWithLicense()
      );

      if (resp.data.status == 'ok') {
        clearInterval(interval);
        callback(resp.data.token);
      }
    } catch (err) {
      logger.error(extractErrorLogData(err), 'Error checking cloud token');
    }
  }, 500);
}

module.exports = {
  createDbGateIdentitySession,
  startCloudTokenChecking,
};
