const mysql = require('mysql');

module.exports = {
  async connect({ server, port, user, password, database }) {
    const connection = mysql.createConnection({ host: server, port, user, password, database });
    return connection;
  },
  async query(connection, sql) {
    return new Promise((resolve, reject) => {
      connection.query(sql, function(error, results, fields) {
        if (error) reject(error);
        resolve({ rows: results });
      });
    });
  },
  async getVersion(connection) {
    const { rows } = await this.query(connection, "show variables like 'version'");
    const version = rows[0].Value;
    return { version };
  },
  async listDatabases(connection) {
    const { rows } = await this.query(connection, 'show databases');
    return rows.map(x => ({ name: x.Database }));
  },
};
