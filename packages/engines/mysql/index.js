const MySqlAnalyser = require('./MySqlAnalyser');
const MySqlDumper = require('./MySqlDumper');

/** @type {import('@dbgate/types').SqlDialect} */
const dialect = {
  rangeSelect: true,
  stringEscapeChar: '\\',
  quoteIdentifier(s) {
    return '`' + s + '`';
  },
};

function extractColumns(fields) {
  if (fields)
    return fields.map((col) => ({
      columnName: col.name,
    }));
  return null;
}

/** @type {import('@dbgate/types').EngineDriver} */
const driver = {
  async connect(nativeModules, { server, port, user, password, database }) {
    const connection = nativeModules.mysql.createConnection({
      host: server,
      port,
      user,
      password,
      database,
    });
    connection._database_name = database;
    connection._nativeModules = nativeModules;
    return connection;
  },
  async query(connection, sql) {
    return new Promise((resolve, reject) => {
      connection.query(sql, function (error, results, fields) {
        if (error) reject(error);
        resolve({ rows: results, columns: extractColumns(fields) });
      });
    });
  },
  async stream(connection, sql, options) {
    const query = connection.query(sql);

    // const handleInfo = (info) => {
    //   const { message, lineNumber, procName } = info;
    //   options.info({
    //     message,
    //     line: lineNumber,
    //     procedure: procName,
    //     time: new Date(),
    //     severity: 'info',
    //   });
    // };

    const handleEnd = (result) => {
      // console.log('RESULT', result);
      options.done(result);
    };

    const handleRow = (row) => {
      options.row(row);
    };

    const handleFields = (columns) => {
      console.log('FIELDS', columns[0].name);
      options.recordset(extractColumns(columns));
    };

    const handleError = (error) => {
      console.log('ERROR', error);
      const { message, lineNumber, procName } = error;
      options.info({
        message,
        line: lineNumber,
        procedure: procName,
        time: new Date(),
        severity: 'error',
      });
    };

    query.on('error', handleError).on('fields', handleFields).on('result', handleRow).on('end', handleEnd);

    return query;
  },
  async readableStream(connection, sql) {
    const query = connection.query(sql);
    const { stream } = connection._nativeModules;

    const pass = new stream.PassThrough({
      objectMode: true,
      highWaterMark: 100,
    });

    query
      .on('error', (err) => {
        console.error(err);
        pass.end();
      })
      .on('fields', (fields) => pass.write({ columns: extractColumns(fields) }))
      .on('result', (row) => pass.write(row))
      .on('end', () => pass.end());

    return pass;
  },
  async getVersion(connection) {
    const { rows } = await this.query(connection, "show variables like 'version'");
    const version = rows[0].Value;
    return { version };
  },
  async analyseFull(pool) {
    const analyser = new MySqlAnalyser(pool, this);
    return analyser.fullAnalysis();
  },
  async analyseIncremental(pool, structure) {
    const analyser = new MySqlAnalyser(pool, this);
    return analyser.incrementalAnalysis(structure);
  },
  async listDatabases(connection) {
    const { rows } = await this.query(connection, 'show databases');
    return rows.map((x) => ({ name: x.Database }));
  },
  createDumper() {
    return new MySqlDumper(this);
  },
  dialect,
  engine: 'mysql',
};

module.exports = driver;
