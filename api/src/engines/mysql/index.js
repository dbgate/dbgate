const mysql = require('mysql');
const MySqlAnalyser = require('./MySqlAnalyser');
const MySqlDumper = require('./MySqlDumper');

/** @type {import('dbgate').SqlDialect} */
const dialect = {
  rangeSelect: true,
  quoteIdentifier(s) {
    return '`' + s + '`';
  },
};

/** @type {import('dbgate').EngineDriver} */
const driver = {
  async connect({ server, port, user, password, database }) {
    const connection = mysql.createConnection({ host: server, port, user, password, database });
    connection._database_name = database;
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
  async analyseFull(pool) {
    const analyser = new MySqlAnalyser(pool, this);
    await analyser.runAnalysis();
    return analyser.result;
  },
  async listDatabases(connection) {
    const { rows } = await this.query(connection, 'show databases');
    return rows.map(x => ({ name: x.Database }));
  },
  createDumper() {
    return new MySqlDumper(this);
  },
  dialect,
};

module.exports = driver;
