module.exports = {
  connections_meta: true,
  async connections(req) {
    return null;
  },

  async getExportedDatabase() {
    return {};
  },

  getConnection_meta: true,
  async getConnection({ conid }) {
    return null;
  },

  getConnectionsForLoginPage_meta: true,
  async getConnectionsForLoginPage() {
    return null;
  },

  getStorageConnectionError() {
    return null;
  },

  readConfig_meta: true,
  async readConfig({ group }) {
    return {};
  },

  sendAuditLog_meta: true,
  async sendAuditLog({}) {
    return null;
  },

  startRefreshLicense() {},

  async getUsedEngines() {
    return null;
  },
};
