const { handleGetSshTunnelRequest, handleGetSshTunnelResponse } = require('./sshTunnelProxy');

function handleProcessCommunication(message, subprocess) {
  const { msgtype } = message;
  if (msgtype == 'getsshtunnel-request') {
    handleGetSshTunnelRequest(message, subprocess);
    return true;
  }
  if (msgtype == 'getsshtunnel-response') {
    handleGetSshTunnelResponse(message, subprocess);
    return true;
  }
  return false;
}

module.exports = {
  handleProcessCommunication,
};
