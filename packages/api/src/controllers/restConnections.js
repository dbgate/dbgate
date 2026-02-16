module.exports = {
  disconnect_meta: true,
  async disconnect({ conid }, req) {
    return null;
  },

  getApiInfo_meta: true,
  async getApiInfo({ conid }, req) {
    return null;
  },

  restStatus_meta: true,
  async restStatus() {
    return {};
  },

  ping_meta: true,
  async ping({ conidArray, strmid }) {
    return null;
  },

  refresh_meta: true,
  async refresh({ conid, keepOpen }, req) {
    return null;
  },

  testConnection_meta: true,
  async testConnection({ conid }, req) {
    return null;
  },

  execute_meta: true,
  async execute({ conid, method, endpoint, parameters, server }, req) {
    return null;
  },

  apiQuery_meta: true,
  async apiQuery({ conid, server, query, variables }, req) {
    return null;
  },
};
