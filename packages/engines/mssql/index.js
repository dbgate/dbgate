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

function extractColumns(columns) {
  return _.sortBy(_.values(columns), 'index')
}

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
      res.columns = extractColumns(resp.recordset.columns);
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
      // console.log('RESULT', result);
      options.done(result);
    };

    const handleRow = (row) => {
      options.row(row);
    };

    const handleRecordset = (columns) => {
      options.recordset(extractColumns(columns));
    };

    request.stream = true;
    request.on('recordset', handleRecordset);
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
