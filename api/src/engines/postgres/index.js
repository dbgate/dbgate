const { Client } = require('pg');

module.exports = {
  async connect({ server, port, user, password, database }) {
    const client = new Client({ host: server, port, user, password, database: database || 'postgres' });
    await client.connect();
    return client;
  },
  async query(client, sql) {
    const res = await client.query(sql);
    return res.rows;
  },
  async getVersion(client) {
    const rows = await this.query(client, 'SELECT version()');
    const { version } = rows[0];
    return { version };
  },
  async listDatabases(client) {
    const res = await this.query(client, 'SELECT datname AS name FROM pg_database WHERE datistemplate = false');
    return res;
  },
};
