const _ = require('lodash');
const PostgreAnalyser = require('./PostgreAnalyser');
const PostgreDumper = require('./PostgreDumper');

/** @type {import('@dbgate/types').SqlDialect} */
const dialect = {
  rangeSelect: true,
  stringEscapeChar: '\\',
  quoteIdentifier(s) {
    return '"' + s + '"';
  },
};

/** @type {import('@dbgate/types').EngineDriver} */
const driver = {
  async connect(nativeModules, { server, port, user, password, database }) {
    const client = new nativeModules.pg.Client({
      host: server,
      port,
      user,
      password,
      database: database || 'postgres',
    });
    await client.connect();
    client._nativeModules = nativeModules;
    return client;
  },
  async query(client, sql) {
    const res = await client.query(sql);
    return { rows: res.rows, columns: res.fields };
  },
  async stream(client, sql, options) {
    const query = new client._nativeModules.pgQueryStream(sql);
    const stream = client.query(query);

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

    let wasHeader = false;

    const handleEnd = (result) => {
      // console.log('RESULT', result);
      options.done(result);
    };

    const handleReadable = () => {
      let row = stream.read();
      if (!wasHeader && row) {
        options.recordset(_.keys(row).map((columnName) => ({ columnName })));
        wasHeader = true;
      }

      while (row) {
        options.row(row);
        row = stream.read();
      }
    };

    // const handleFields = (columns) => {
    //   // console.log('FIELDS', columns[0].name);
    //   options.recordset(columns);
    //   // options.recordset(extractColumns(columns));
    // };

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

    stream.on('error', handleError);
    stream.on('readable', handleReadable);
    // stream.on('result', handleRow)
    // stream.on('data', handleRow)
    stream.on('end', handleEnd);

    return stream;
  },
  async getVersion(client) {
    const { rows } = await this.query(client, 'SELECT version()');
    const { version } = rows[0];
    return { version };
  },
  async analyseFull(pool) {
    const analyser = new PostgreAnalyser(pool, this);
    return analyser.fullAnalysis();
  },
  async analyseIncremental(pool, structure) {
    const analyser = new PostgreAnalyser(pool, this);
    return analyser.incrementalAnalysis(structure);
  },
  createDumper() {
    return new PostgreDumper(this);
  },
  async listDatabases(client) {
    const { rows } = await this.query(client, 'SELECT datname AS name FROM pg_database WHERE datistemplate = false');
    return rows;
  },
  dialect,
  engine: 'postgres',
};

module.exports = driver;
