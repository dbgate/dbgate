const uuidv1 = require('uuid/v1');
const { getSshTunnel } = require('./sshTunnel');

const dispatchedMessages = {};

async function handleGetSshTunnelRequest({ msgid, connection }, subprocess) {
  const response = await getSshTunnel(connection);
  subprocess.send({ msgtype: 'getsshtunnel-response', msgid, response });
}

function handleGetSshTunnelResponse({ msgid, response }, subprocess) {
  const { resolve } = dispatchedMessages[msgid];
  delete dispatchedMessages[msgid];
  resolve(response);
}

async function getSshTunnelProxy(connection) {
  if (!process.send) return getSshTunnel(connection);
  const msgid = uuidv1();
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
