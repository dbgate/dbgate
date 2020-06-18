const _ = require('lodash');
const MsSqlAnalyser = require('./MsSqlAnalyser');
const MsSqlDumper = require('./MsSqlDumper');
const createBulkInsertStream = require('./createBulkInsertStream');
const { analyseSingleObject } = require('../mysql');

/** @type {import('@dbgate/types').SqlDialect} */
const dialect = {
  limitSelect: true,
  rangeSelect: true,
  offsetFetchRangeSyntax: true,
  stringEscapeChar: "'",
  fallbackDataType: 'nvarchar(max)',
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
    const pool = new nativeModules.mssql.ConnectionPool({
      server,
      port,
      user,
      password,
      database,
      requestTimeout: 1000 * 3600,
      options: {
        enableArithAbort: true,
      },
    });
    await pool.connect();
    pool._nativeModules = nativeModules;
    return pool;
  },
  // @ts-ignore
  async query(pool, sql) {
    if (sql == null) {
      return {
        rows: [],
        columns: [],
      };
    }
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

    return request;
  },
  async readQuery(pool, sql) {
    const request = await pool.request();
    const { stream } = pool._nativeModules;

    const pass = new stream.PassThrough({
      objectMode: true,
      highWaterMark: 100,
    });

    request.stream = true;
    request.on('recordset', (driverColumns) => {
      const [columns, mapper] = extractColumns(driverColumns);
      pass.write({ columns });
    });
    request.on('row', (row) => pass.write(row));
    request.on('error', (err) => {
      console.error(err);
      pass.end();
    });
    request.on('done', () => pass.end());

    request.query(sql);

    return pass;
  },
  async writeTable(pool, name, options) {
    const { stream, mssql } = pool._nativeModules;
    return createBulkInsertStream(this, mssql, stream, pool, name, options);
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
  async analyseSingleObject(pool, name, typeField = 'tables') {
    const analyser = new MsSqlAnalyser(pool, this);
    analyser.singleObjectFilter = { name, typeField };
    const res = await analyser.fullAnalysis();
    return res.tables[0];
  },
  // @ts-ignore
  analyseSingleTable(pool, name) {
    return this.analyseSingleObject(pool, name, 'tables');
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
