const connections = require('./connections');
const socket = require('../utility/socket');

module.exports = {
  opened: [],

  async ensureOpened(id) {
    const existing = this.opened.find(x => x.connection.id == id);
    if (existing) return existing;
    
  },

  listDatabases_meta: 'get',
  async listDatabases({ id }) {
    const opened = this.ensureOpened(id);
  },
};
