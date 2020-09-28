const _ = require('lodash');
const driverBase = require('../default/driverBase');
const PostgreAnalyser = require('./PostgreAnalyser');
const PostgreDumper = require('./PostgreDumper');

/** @type {import('@dbgate/types').SqlDialect} */
const dialect = {
  rangeSelect: true,
  // stringEscapeChar: '\\',
  stringEscapeChar: "'",
  fallbackDataType: 'varchar',
  quoteIdentifier(s) {
    return '"' + s + '"';
  },
};

/** @type {import('@dbgate/types').EngineDriver} */
const driver = {
  ...driverBase,
  analyserClass: PostgreAnalyser,
  dumperClass: PostgreDumper,

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
    if (sql == null) {
      return {
        rows: [],
        columns: [],
      };
    }
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
    return { version };
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
    const query = new client._nativeModules.pgQueryStream(sql);
    const { stream } = client._nativeModules;

    const queryStream = client.query(query);

    let wasHeader = false;

    const pass = new stream.PassThrough({
      objectMode: true,
      highWaterMark: 100,
    });

    const handleEnd = (result) => {
      pass.end();
    };

    const handleReadable = () => {
      let row = queryStream.read();
      if (!wasHeader && row) {
        pass.write(
          structure || {
            columns: _.keys(row).map((columnName) => ({ columnName })),
          }
        );
        wasHeader = true;
      }

      while (row) {
        pass.write(row);
        row = queryStream.read();
      }
    };

    const handleError = (error) => {
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
  async listDatabases(client) {
    const { rows } = await this.query(client, 'SELECT datname AS name FROM pg_database WHERE datistemplate = false');
    return rows;
  },
  dialect,
  engine: 'postgres',
};

module.exports = driver;
