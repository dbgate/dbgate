const _ = require('lodash');
const stream = require('stream');
const { identify } = require('sql-query-identifier');

const driverBase = require('../frontend/driver');
const Analyser = require('./Analyser');
const pg = require('pg');
const pgQueryStream = require('pg-query-stream');
const { createBulkInsertStreamBase, makeUniqueColumnNames } = require('dbgate-tools');

function extractPostgresColumns(result) {
  if (!result || !result.fields) return [];
  const res = result.fields.map(fld => ({
    columnName: fld.name,
  }));
  makeUniqueColumnNames(res);
  return res;
}

function zipDataRow(rowArray, columns) {
  return _.zipObject(
    columns.map(x => x.columnName),
    rowArray
  );
}

async function runStreamItem(client, sql, options) {
  return new Promise((resolve, reject) => {
    const query = new pgQueryStream(sql, undefined, { rowMode: 'array' });
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

    const handleEnd = result => {
      // console.log('RESULT', result);
      resolve();
    };

    let columns = null;
    const handleReadable = () => {
      if (!wasHeader) {
        columns = extractPostgresColumns(query._result);
        if (columns && columns.length > 0) {
          options.recordset(columns);
        }
        wasHeader = true;
      }

      for (;;) {
        const row = stream.read();
        if (!row) break;

        options.row(zipDataRow(row, columns));
      }
    };

    // const handleFields = (columns) => {
    //   // console.log('FIELDS', columns[0].name);
    //   options.recordset(columns);
    //   // options.recordset(extractColumns(columns));
    // };

    const handleError = error => {
      console.log('ERROR', error);
      const { message, lineNumber, procName } = error;
      options.info({
        message,
        line: lineNumber,
        procedure: procName,
        time: new Date(),
        severity: 'error',
      });
      resolve();
    };

    stream.on('error', handleError);
    stream.on('readable', handleReadable);
    // stream.on('result', handleRow)
    // stream.on('data', handleRow)
    stream.on('end', handleEnd);
  });
}

/** @type {import('dbgate-types').EngineDriver} */
const driver = {
  ...driverBase,
  analyserClass: Analyser,

  async connect({ server, port, user, password, database, ssl }) {
    const client = new pg.Client({
      host: server,
      port,
      user,
      password,
      database: database || 'postgres',
      ssl,
    });
    await client.connect();
    return client;
  },
  async query(client, sql) {
    if (sql == null) {
      return {
        rows: [],
        columns: [],
      };
    }
    const res = await client.query({ text: sql, rowMode: 'array' });
    const columns = extractPostgresColumns(res);
    return { rows: res.rows.map(row => zipDataRow(row, columns)), columns };
  },
  async stream(client, sql, options) {
    const sqlSplitted = identify(sql, { dialect: 'psql', strict: false });

    for (const sqlItem of sqlSplitted) {
      await runStreamItem(client, sqlItem.text, options);
    }

    options.done();
    // return stream;
  },
  // async analyseSingleObject(pool, name, typeField = 'tables') {
  //   const analyser = new PostgreAnalyser(pool, this);
  //   analyser.singleObjectFilter = { ...name, typeField };
  //   const res = await analyser.fullAnalysis();
  //   return res.tables[0];
  // },
  // // @ts-ignore
  // analyseSingleTable(pool, name) {
  //   return this.analyseSingleObject(pool, name, 'tables');
  // },
  async getVersion(client) {
    const { rows } = await this.query(client, 'SELECT version()');
    const { version } = rows[0];
    return {
      version,
      versionText: (version || '').replace(/\s*\(.*$/, ''),
    };
  },
  // async analyseFull(pool) {
  //   const analyser = new PostgreAnalyser(pool, this);
  //   return analyser.fullAnalysis();
  // },
  // async analyseIncremental(pool, structure) {
  //   const analyser = new PostgreAnalyser(pool, this);
  //   return analyser.incrementalAnalysis(structure);
  // },
  async readQuery(client, sql, structure) {
    const query = new pgQueryStream(sql, undefined, { rowMode: 'array' });

    const queryStream = client.query(query);

    let wasHeader = false;

    const pass = new stream.PassThrough({
      objectMode: true,
      highWaterMark: 100,
    });

    const handleEnd = result => {
      pass.end();
    };

    let columns = null;
    const handleReadable = () => {
      if (!wasHeader) {
        columns = extractPostgresColumns(query._result);
        pass.write({
          __isStreamHeader: true,
          ...(structure || { columns }),
        });
        wasHeader = true;
      }

      for (;;) {
        const row = queryStream.read();
        if (!row) break;

        pass.write(zipDataRow(row, columns));
      }
    };

    const handleError = error => {
      console.error(error);
      pass.end();
    };

    queryStream.on('error', handleError);
    queryStream.on('readable', handleReadable);
    queryStream.on('end', handleEnd);

    return pass;
  },
  // createDumper() {
  //   return new PostgreDumper(this);
  // },
  async writeTable(pool, name, options) {
    // @ts-ignore
    return createBulkInsertStreamBase(this, stream, pool, name, options);
  },
  async listDatabases(client) {
    const { rows } = await this.query(client, 'SELECT datname AS name FROM pg_database WHERE datistemplate = false');
    return rows;
  },
};

module.exports = driver;
