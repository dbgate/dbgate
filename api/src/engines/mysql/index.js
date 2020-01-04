const mysql = require('mysql');

module.exports = {
  async connect({ server, port, user, password }) {
    const connection = mysql.createConnection({ host: server, port, user, password });
    return connection;
  },
  async query(connection, sql) {
    return new Promise((resolve, reject) => {
      connection.query(sql, function(error, results, fields) {
        if (error) reject(error);
        resolve(results);
      });
    });
  },
  async getVersion(connection) {
    const rows = await this.query(connection, "show variables like 'version'");
    const version = rows[0].Value;
    return { version };
  },
  async listDatabases(connection) {
    const res = await this.query(connection, 'show databases');
    return res.map(x => ({ name: x.Database }));
  },
};
