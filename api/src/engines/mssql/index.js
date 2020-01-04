const mssql = require('mssql');

module.exports = {
  async connect({ server, port, user, password }) {
    const pool = await mssql.connect({ server, port, user, password });
    return pool;
  },
  async query(pool, sql) {
    const resp = await pool.request().query(sql);
    return resp.recordset;
  },
  async getVersion(pool) {
    const { version } = (await this.query(pool, 'SELECT @@VERSION AS version'))[0];
    return { version };
  },
  async listDatabases(pool) {
    const res = await this.query(pool, 'SELECT name FROM sys.databases order by name');
    return res;
  },
};
