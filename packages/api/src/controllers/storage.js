module.exports = {
  connections_meta: true,
  async connections(req) {
    return null;
  },

  getConnection_meta: true,
  async getConnection({ conid }) {
    return null;
  },

  async loadSuperadminPermissions() {
    return [];
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

  startRefreshLicense() {},
};
