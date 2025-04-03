// @ts-check
//
const stream = require('stream');
const Analyser = require('./Analyser');
const driverBase = require('../frontend/driver');
const { getLogger, extractErrorLogData, createBulkInsertStreamBase } = require('dbgate-tools');
const { getColumnsInfo, normalizeRow } = require('./helpers');

const logger = getLogger('sqliteDriver');

/**
 * @type {import('@duckdb/node-api')}
 */
let duckDb;

function getDuckDb() {
  if (!duckDb) {
    duckDb = require('@duckdb/node-api');
  }

  return duckDb;
}

let fileToCon = {};
async function getConnection(file) {
  if (fileToCon[file]) {
    fileToCon[file].close();
  }

  const duckDb = getDuckDb();
  const instance = await duckDb.DuckDBInstance.create(file);
  console.log('DuckDB instance created', instance);
  const connection = await instance.connect();

  fileToCon[file] = connection;

  return fileToCon[file];
}

/** @type {import('dbgate-types').EngineDriver<import('@duckdb/node-api').DuckDBConnection>} */
const driver = {
  ...driverBase,
  analyserClass: Analyser,
  async connect({ databaseFile, isReadOnly }) {
    return {
      client: await getConnection(databaseFile),
    };
  },
  async close(dbhan) {
    dbhan.client.disconnect();
    dbhan.client.close();
  },
  async query(dbhan, sql, { readonly } = {}) {
    const res = await dbhan.client.runAndReadAll(sql);
    const rowsObjects = res.getRowObjects();

    const columnNames = res.columnNames();
    const columnTypes = res.columnTypes();

    const columns = getColumnsInfo(columnNames, columnTypes).map(normalizeRow);

    const rows = rowsObjects.map(normalizeRow);
    return {
      rows,
      columns,
    };
  },
  async stream(dbhan, sql, options) {
    const duckdb = getDuckDb();
    const statements = await dbhan.client.extractStatements(sql);
    const count = statements.count;

    try {
      for (let i = 0; i < count; i++) {
        let hasSentColumns = false;
        const stmt = await statements.prepare(i);
        const res = await stmt.runAndReadAll();

        const returningStatemetes = [
          duckdb.StatementType.SELECT,
          duckdb.StatementType.EXPLAIN,
          duckdb.StatementType.EXECUTE,
          duckdb.StatementType.RELATION,
          duckdb.StatementType.LOGICAL_PLAN,
        ];

        if (!returningStatemetes.includes(stmt.statementType)) {
          continue;
        }

        options.info({
          message: JSON.stringify(res),
          time: new Date(),
          severity: 'info',
        });

        if (!hasSentColumns) {
          const columnNames = res.columnNames();
          const columnTypes = res.columnTypes();
          const columns = getColumnsInfo(columnNames, columnTypes);

          options.recordset(columns);
          hasSentColumns = true;
        }

        const rows = res.getRowObjects();

        for (const row of rows) {
          options.row(normalizeRow(row));
        }
      }

      options.done();
    } catch (error) {
      logger.error(extractErrorLogData(error), 'Stream error');
      const { message, procName } = error;
      options.info({
        message,
        line: 0,
        procedure: procName,
        time: new Date(),
        severity: 'error',
      });
      options.done();
    }
  },
  async script(dbhan, sql) {
    const dmp1 = driver.createDumper();
    dmp1.beginTransaction();

    await dbhan.client.run(dmp1.s);

    const statements = await dbhan.client.extractStatements(sql);
    const count = statements.count;

    for (let i = 0; i < count; i++) {
      const stmt = await statements.prepare(i);
      await stmt.run();
    }

    const dmp2 = driver.createDumper();
    dmp2.commitTransaction();

    await dbhan.client.run(dmp2.s);
  },

  async readQuery(dbhan, sql, structure) {
    const pass = new stream.PassThrough({
      objectMode: true,
      highWaterMark: 100,
    });

    const res = await dbhan.client.runAndReadAll(sql);
    const rowsObjects = res.getRowObjects();

    const columnNames = res.columnNames();
    const columnTypes = res.columnTypes();

    const columns = getColumnsInfo(columnNames, columnTypes).map(normalizeRow);

    const rows = rowsObjects.map(normalizeRow);

    pass.write({
      __isStreamHeader: true,
      ...(structure || {
        columns: columns.map((col) => ({
          columnName: col.name,
          dataType: col.type,
        })),
      }),
    });

    for (const row of rows) {
      pass.write(row);
    }

    return pass;
  },
  async writeTable(dbhan, name, options) {
    return createBulkInsertStreamBase(this, stream, dbhan, name, options);
  },
  async getVersion(dbhan) {
    const { rows } = await this.query(dbhan, 'SELECT version() AS version;');
    const { version } = rows[0];

    return {
      version,
      versionText: `DuchDB ${version}`,
    };
  },
};

module.exports = driver;
