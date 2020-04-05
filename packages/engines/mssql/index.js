const _ = require('lodash');
const MsSqlAnalyser = require('./MsSqlAnalyser');
const MsSqlDumper = require('./MsSqlDumper');

/** @type {import('@dbgate/types').SqlDialect} */
const dialect = {
  limitSelect: true,
  rangeSelect: true,
  offsetFetchRangeSyntax: true,
  stringEscapeChar: "'",
  quoteIdentifier(s) {
    return `[${s}]`;
  },
};

/** @type {import('@dbgate/types').EngineDriver} */
const driver = {
  async connect(nativeModules, { server, port, user, password, database }) {
    const pool = await nativeModules.mssql.connect({
      server,
      port,
      user,
      password,
      database,
      options: {
        enableArithAbort: true,
      },
    });
    pool._nativeModules = nativeModules;
    return pool;
  },
  async query(pool, sql) {
    const resp = await pool.request().query(sql);
    // console.log(Object.keys(resp.recordset));
    // console.log(resp);
    const res = {};

    if (resp.recordset) {
      res.columns = _.sortBy(_.values(resp.recordset.columns), 'index');
      res.rows = resp.recordset;
    }
    if (resp.rowsAffected) {
      res.rowsAffected = _.sum(resp.rowsAffected);
    }
    return res;
  },
  async stream(pool, sql, options) {
    const request = await pool.request();

    const handleInfo = (info) => {
      const { message, lineNumber, procName } = info;
      options.info({
        message,
        line: lineNumber,
        procedure: procName,
        time: new Date(),
      });
    };

    const handleDone = (result) => {
      console.log('RESULT', result);
    };

    const handleRow = (row) => {
      console.log('ROW', row);
    };

    request.stream = true;
    request.on('recordset', options.recordset);
    request.on('row', handleRow);
    request.on('error', options.error);
    request.on('done', handleDone);
    request.on('info', handleInfo);
    request.query(sql);
  },
  async getVersion(pool) {
    const { version } = (await this.query(pool, 'SELECT @@VERSION AS version')).rows[0];
    return { version };
  },
  async listDatabases(pool) {
    const { rows } = await this.query(pool, 'SELECT name FROM sys.databases order by name');
    return rows;
  },
  async analyseFull(pool) {
    const analyser = new MsSqlAnalyser(pool, this);
    await analyser.runAnalysis();
    return analyser.result;
  },
  // async analyseIncremental(pool) {},
  createDumper() {
    return new MsSqlDumper(this);
  },
  dialect,
  engine: 'mssql',
};

module.exports = driver;
