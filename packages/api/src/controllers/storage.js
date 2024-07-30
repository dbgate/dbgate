module.exports = {
  connections_meta: true,
  async connections(req) {
    return null;
  },

  async getConnection({ conid }) {
    return null;
  },

  async loadSuperadminPermissions() {
    return [];
  }
};
