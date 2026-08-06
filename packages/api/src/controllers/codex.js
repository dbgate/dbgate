const oauth = require('../codex/oauth');
const responses = require('../codex/responses');

function requireEnabled() {
  if (!oauth.isEnabled()) {
    throw new Error('DBGM-00000 Codex OAuth is available only in the experimental desktop integration');
  }
}

module.exports = {
  getStatus_meta: true,
  async getStatus() {
    return oauth.getStatus();
  },

  startLogin_meta: true,
  async startLogin(params) {
    requireEnabled();
    return oauth.startLogin(params);
  },

  cancelLogin_meta: true,
  async cancelLogin(params) {
    requireEnabled();
    return oauth.cancelLogin(params);
  },

  disconnect_meta: true,
  async disconnect(params) {
    requireEnabled();
    await responses.cancelAllResponses();
    return oauth.disconnect(params);
  },

  startResponse_meta: true,
  async startResponse(params) {
    requireEnabled();
    return responses.startResponse(params);
  },

  cancelResponse_meta: true,
  async cancelResponse(params) {
    requireEnabled();
    return responses.cancelResponse(params);
  },
};
