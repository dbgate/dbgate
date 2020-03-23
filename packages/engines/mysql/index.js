const MySqlAnalyser = require("./MySqlAnalyser");
const MySqlDumper = require("./MySqlDumper");

/** @type {import('@dbgate/types').SqlDialect} */
const dialect = {
  rangeSelect: true,
  stringEscapeChar: "\\",
  quoteIdentifier(s) {
    return "`" + s + "`";
  }
};

/** @type {import('@dbgate/types').EngineDriver} */
const driver = {
  async connect(nativeModules, { server, port, user, password, database }) {
    const connection = nativeModules.mysql.createConnection({
      host: server,
      port,
      user,
      password,
      database
    });
    connection._database_name = database;
    connection._nativeModules = nativeModules;
    return connection;
  },
  async query(connection, sql) {
    return new Promise((resolve, reject) => {
      connection.query(sql, function(error, results, fields) {
        if (error) reject(error);
        resolve({ rows: results, columns: fields });
      });
    });
  },
  async getVersion(connection) {
    const { rows } = await this.query(
      connection,
      "show variables like 'version'"
    );
    const version = rows[0].Value;
    return { version };
  },
  async analyseFull(pool) {
    const analyser = new MySqlAnalyser(pool, this);
    await analyser.runAnalysis();
    return analyser.result;
  },
  async listDatabases(connection) {
    const { rows } = await this.query(connection, "show databases");
    return rows.map(x => ({ name: x.Database }));
  },
  createDumper() {
    return new MySqlDumper(this);
  },
  dialect,
  engine: 'mysql',
};

module.exports = driver;
