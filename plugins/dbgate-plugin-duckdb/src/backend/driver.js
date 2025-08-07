// @ts-check
//
const stream = require('stream');
const Analyser = require('./Analyser');
const driverBase = require('../frontend/driver');
const { getLogger, extractErrorLogData, createBulkInsertStreamBase } = require('dbgate-tools');
const { getColumnsInfo, normalizeRow } = require('./helpers');
const sql = require('./sql');
const { mapSchemaRowToSchemaInfo } = require('./Analyser.helpers');
const { zipObject } = require('lodash');

const logger = getLogger('duckdbDriver');

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

function getReturningStatementTypes() {
  const duckdb = getDuckDb();

  const returningStatementTypes = [
    duckdb.StatementType.SELECT,
    duckdb.StatementType.EXPLAIN,
    duckdb.StatementType.EXECUTE,
    duckdb.StatementType.RELATION,
    duckdb.StatementType.LOGICAL_PLAN,
  ];

  return returningStatementTypes;
}

/** @type {import('dbgate-types').EngineDriver<import('@duckdb/node-api').DuckDBConnection>} */
const driver = {
  ...driverBase,
  analyserClass: Analyser,
  async connect({ databaseFile, isReadOnly }) {
    const instance = await getDuckDb().DuckDBInstance.create(databaseFile);
    const connection = await instance.connect();

    return {
      client: connection,
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

    try {
      const statements = await dbhan.client.extractStatements(sql);
      const returningStatementTypes = getReturningStatementTypes();
      const count = statements.count;

      for (let i = 0; i < count; i++) {
        const stmt = await statements.prepare(i);

        const result = await stmt.stream();
        let hasSentColumns = false;

        while (true) {
          const chunk = await result.fetchChunk();

          if (!returningStatementTypes.includes(stmt.statementType)) {
            break;
          }

          if (!chunk || chunk.rowCount === 0) {
            break;
          }

          if (!hasSentColumns) {
            const columnNames = result.columnNames();
            const columnTypes = result.columnTypes();
            const columns = getColumnsInfo(columnNames, columnTypes);
            options.recordset(columns);
            hasSentColumns = true;
          }

          const rows = chunk.getRows();
          const columnNames = result.columnNames();

          for (const row of rows) {
            const zipped = zipObject(columnNames, row);
            options.row(normalizeRow(zipped));
          }
        }
      }

      options.done();
    } catch (error) {
      logger.error(extractErrorLogData(error), 'DBGM-00188 Stream error');
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
  async script(dbhan, sql, { useTransaction } = { useTransaction: false }) {
    if (useTransaction) {
      const dmp1 = driver.createDumper();
      dmp1.beginTransaction();

      await dbhan.client.run(dmp1.s);
    }

    const statements = await dbhan.client.extractStatements(sql);
    const count = statements.count;

    for (let i = 0; i < count; i++) {
      const stmt = await statements.prepare(i);
      await stmt.run();
    }

    if (useTransaction) {
      const dmp2 = driver.createDumper();
      dmp2.commitTransaction();

      await dbhan.client.run(dmp2.s);
    }
  },

  async readQuery(dbhan, sql, structure) {
    const pass = new stream.PassThrough({
      objectMode: true,
      highWaterMark: 100,
    });

    try {
      const statements = await dbhan.client.extractStatements(sql);
      const returningStatementTypes = getReturningStatementTypes();
      const count = statements.count;

      for (let i = 0; i < count; i++) {
        const stmt = await statements.prepare(i);

        if (!returningStatementTypes.includes(stmt.statementType)) {
          continue;
        }

        const result = await stmt.stream();
        let hasSentHeader = false;

        while (true) {
          const chunk = await result.fetchChunk();
          if (!chunk || chunk.rowCount === 0) {
            break;
          }

          if (!hasSentHeader) {
            const columnNames = result.columnNames();
            const columnTypes = result.columnTypes();
            const columns = getColumnsInfo(columnNames, columnTypes);

            pass.write({
              __isStreamHeader: true,
              ...(structure || {
                columns: columns.map((col) => ({
                  columnName: col.columnName,
                  dataType: col.dataType,
                })),
              }),
            });
            hasSentHeader = true;
          }

          const rows = chunk.getRows();
          const columnNames = result.columnNames();
          for (const row of rows) {
            const zipped = zipObject(columnNames, row);
            pass.write(normalizeRow(zipped));
          }
        }
      }

      pass.end();
      return pass;
    } catch (error) {
      logger.error(extractErrorLogData(error), 'DBGM-00189 ReadQuery error');
      const { message, procName } = error;
      pass.write({
        __isStreamInfo: true,
        info: {
          message,
          line: 0,
          procedure: procName,
          time: new Date(),
          severity: 'error',
        },
      });
      pass.end();
      return pass;
    }
  },
  async writeTable(dbhan, name, options) {
    return createBulkInsertStreamBase(this, stream, dbhan, name, options);
  },
  async getVersion(dbhan) {
    const { rows } = await this.query(dbhan, 'SELECT version() AS version;');
    const { version } = rows?.[0];

    return {
      version,
      versionText: `DuckDB ${version}`,
    };
  },

  async listSchemas(dbhan) {
    const schemasResult = await this.query(dbhan, sql.schemas);
    const schemas = schemasResult.rows?.map(mapSchemaRowToSchemaInfo);

    return schemas ?? null;
  },
};

module.exports = driver;
