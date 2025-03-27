const Analyser = require('./Analyser');
const Dumper = require('../frontend/Dumper');
const driverBase = require('../frontend/driver');
const { getLogger, extractErrorLogData } = require('dbgate-tools');
const { getColumnsInfo, serializeRow, normalizeRow } = require('./helpers');

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
    console.log('query', sql);
    const res = await dbhan.client.runAndReadAll(sql);
    const rowsObjects = res.getRowObjects();

    const columnNames = res.getColumns();
    const columnTypes = res.columnTypes();
    const columns = getColumnsInfo(columnNames, columnTypes).map(normalizeRow);
    const rows = rowsObjects.map(normalizeRow);

    return {
      rows,
      columns,
    };
  },
  async stream(dbhan, sql, options) {
    const statements = await dbhan.client.extractStatements(sql);
    const count = statements.count;

    try {
      let hasSentColumns = false;

      for (let i = 0; i < count; i++) {
        const stmt = await statements.prepare(i);
        const res = await stmt.runAndReadAll();

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
    const inTransaction = dbhan.client.transaction(() => {
      for (const sqlItem of splitQuery(sql, this.getQuerySplitterOptions('script'))) {
        const stmt = dbhan.client.prepare(sqlItem);
        stmt.run();
      }
    });
    inTransaction();
  },

  async readQueryTask(stmt, pass) {
    // let sent = 0;
    for (const row of stmt.iterate()) {
      // sent++;
      if (!pass.write(row)) {
        // console.log('WAIT DRAIN', sent);
        await waitForDrain(pass);
      }
    }
    pass.end();
  },
  async readQuery(dbhan, sql, structure) {
    const pass = new stream.PassThrough({
      objectMode: true,
      highWaterMark: 100,
    });

    const s = dbhan.client.streamAndReadAll(sql);
    console.log(s);

    const stmt = dbhan.client.prepare(sql);
    const columns = stmt.columns();

    pass.write({
      __isStreamHeader: true,
      ...(structure || {
        columns: columns.map((col) => ({
          columnName: col.name,
          dataType: col.type,
        })),
      }),
    });
    this.readQueryTask(stmt, pass);

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
