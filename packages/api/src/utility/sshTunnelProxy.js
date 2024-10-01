const crypto = require('crypto');
const { getLogger, extractErrorLogData } = require('dbgate-tools');
const { getSshTunnel } = require('./sshTunnel');
const logger = getLogger('sshTunnelProxy');

const dispatchedMessages = {};

async function handleGetSshTunnelRequest({ msgid, connection }, subprocess) {
  const response = await getSshTunnel(connection);
  try {
    subprocess.send({ msgtype: 'getsshtunnel-response', msgid, response });
  } catch (err) {
    logger.error(extractErrorLogData(err), 'Error sending to SSH tunnel');
  }
}

function handleGetSshTunnelResponse({ msgid, response }, subprocess) {
  const { resolve } = dispatchedMessages[msgid];
  delete dispatchedMessages[msgid];
  resolve(response);
}

async function getSshTunnelProxy(connection) {
  if (!process.send) return getSshTunnel(connection);
  const msgid = crypto.randomUUID();
  process.send({ msgtype: 'getsshtunnel-request', msgid, connection });
  return new Promise((resolve, reject) => {
    dispatchedMessages[msgid] = { resolve, reject };
  });
}

module.exports = {
  handleGetSshTunnelRequest,
  handleGetSshTunnelResponse,
  getSshTunnelProxy,
};
