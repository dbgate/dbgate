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
  const mapper = {};
  const res = _.sortBy(_.values(columns), 'index').map((col) => ({
    ...col,
    columnName: col.name,
    notNull: !col.nullable,
    autoIncrement: !!col.identity,
  }));

  const generateName = () => {
    let index = 1;
    while (res.find((x) => x.columnName == `col${index}`)) index += 1;
    return `col${index}`;
  };

  // const groups = _.groupBy(res, 'columnName');
  // for (const colname of _.keys(groups)) {
  //   if (groups[colname].length == 1) continue;
  //   mapper[colname] = [];
  //   for (const col of groups[colname]) {
  //     col.columnName = generateName();
  //     mapper[colname].push(colname);
  //   }
  // }

  for (const col of res) {
    if (!col.columnName) {
      const newName = generateName();
      mapper[col.columnName] = newName;
      col.columnName = newName;
    }
  }

  return [res, mapper];
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
  // @ts-ignore
  async query(pool, sql) {
    const resp = await pool.request().query(sql);
    // console.log(Object.keys(resp.recordset));
    // console.log(resp);
    const res = {};

    if (resp.recordset) {
      const [columns] = extractColumns(resp.recordset.columns);
      res.columns = columns;
      res.rows = resp.recordset;
    }
    if (resp.rowsAffected) {
      res.rowsAffected = _.sum(resp.rowsAffected);
    }
    return res;
  },
  async stream(pool, sql, options) {
    const request = await pool.request();
    let currentMapper = null;

    const handleInfo = (info) => {
      const { message, lineNumber, procName } = info;
      options.info({
        message,
        line: lineNumber,
        procedure: procName,
        time: new Date(),
        severity: 'info',
      });
    };

    const handleDone = (result) => {
      // console.log('RESULT', result);
      options.done(result);
    };

    const handleRow = (row) => {
      // if (currentMapper) {
      //   for (const colname of _.keys(currentMapper)) {
      //     let index = 0;
      //     for (const newcolname of currentMapper[colname]) {
      //       row[newcolname] = row[colname][index];
      //       index += 1;
      //     }
      //     delete row[colname];
      //   }
      // }
      if (currentMapper) {
        row = { ...row };
        for (const colname of _.keys(currentMapper)) {
          const newcolname = currentMapper[colname];
          row[newcolname] = row[colname];
          if (_.isArray(row[newcolname])) row[newcolname] = row[newcolname].join(',');
          delete row[colname];
        }
      }

      options.row(row);
    };

    const handleRecordset = (columns) => {
      const [extractedColumns, mapper] = extractColumns(columns);
      currentMapper = mapper;
      options.recordset(extractedColumns);
    };

    const handleError = (error) => {
      const { message, lineNumber, procName } = error;
      options.info({
        message,
        line: lineNumber,
        procedure: procName,
        time: new Date(),
        severity: 'error',
      });
    };

    request.stream = true;
    request.on('recordset', handleRecordset);
    request.on('row', handleRow);
    request.on('error', handleError);
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
    return analyser.fullAnalysis();
  },
  async analyseIncremental(pool, structure) {
    const analyser = new MsSqlAnalyser(pool, this);
    return analyser.incrementalAnalysis(structure);
  },
  createDumper() {
    return new MsSqlDumper(this);
  },
  dialect,
  engine: 'mssql',
};

module.exports = driver;
