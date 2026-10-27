const oauth = require('../codex/oauth');
const responses = require('../codex/responses');

function requireEnabled() {
  if (!oauth.isEnabled()) {
    throw new Error('DBGM-00000 Codex OAuth is available only in the experimental desktop integration');
  }
}

module.exports = {
  getStatus_access: 'user',
  getStatus_meta: true,
  async getStatus() {
    return oauth.getStatus();
  },

  startLogin_access: 'self',

  startLogin_meta: true,
  async startLogin(params) {
    requireEnabled();
    return oauth.startLogin(params);
  },

  cancelLogin_access: 'self',

  cancelLogin_meta: true,
  async cancelLogin(params) {
    requireEnabled();
    return oauth.cancelLogin(params);
  },

  disconnect_access: 'self',

  disconnect_meta: true,
  async disconnect(params) {
    requireEnabled();
    await responses.cancelAllResponses();
    return oauth.disconnect(params);
  },

  startResponse_access: 'self',

  startResponse_meta: true,
  async startResponse(params) {
    requireEnabled();
    return responses.startResponse(params);
  },

  cancelResponse_access: 'self',

  cancelResponse_meta: true,
  async cancelResponse(params) {
    requireEnabled();
    return responses.cancelResponse(params);
  },
};
