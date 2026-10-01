// @ts-check
const _ = require('lodash');
const stream = require('stream');
const driverBases = require('../frontend/drivers');
const Analyser = require('./Analyser');
const { splitQuery, sqliteSplitterOptions } = require('dbgate-query-splitter');
const { runStreamItem, waitForDrain, modifyRow } = require('./helpers');
const createLibsqlDumperConnection = require('./libsqlDumperConnection');
const { backupWithSqliteDumper, restoreWithSqliteDumper } = require('./sqliteDumperOperations');
const { getLogger, createBulkInsertStreamBase, extractErrorLogData } = global.DBGATE_PACKAGES['dbgate-tools'];

const logger = getLogger('sqliteDriver');

let libsqlValue;
function getLibsql() {
  if (!libsqlValue) {
    libsqlValue = require('libsql');
  }
  return libsqlValue;
}

function extractColumns(row) {
  if (!row) return [];

  const columns = Object.keys(row).map((columnName) => ({ columnName }));
  return columns;
}

/**
 * Built-in backup and restore is offered only for libSQL database files. Over a URL every statement
 * is a network round trip and the read snapshot and transactions the dumper relies on are not
 * guaranteed, so remote databases are not supported yet.
 */
function assertLocalLibsqlConnection(connection) {
  if (!connection.databaseFile) {
    throw new Error('DBGM-00000 Built-in backup and restore is available only for libSQL database files, not URLs');
  }
}

/** @type {import('dbgate-types').EngineDriver<import('libsql').Database>} */
const libsqlDriver = {
  ...driverBases[1],
  analyserClass: Analyser,
  async connect({ databaseFile, isReadOnly, authToken, databaseUrl, ...rest }) {
    const Database = getLibsql();
    const client = databaseFile
      ? new Database(databaseFile, { readonly: !!isReadOnly })
      : new Database(databaseUrl, { authToken, readonly: !!isReadOnly });
    client.defaultSafeIntegers(true);

    return {
      client,
    };
  },
  async close(dbhan) {
    // sqlite close is sync, returns this
    dbhan.client.close();
  },
  async backupDatabase(connection, settings, runner) {
    assertLocalLibsqlConnection(connection);
    return backupWithSqliteDumper(this, connection, settings, runner, {
      product: 'LibSQL',
      createDumperConnection: createLibsqlDumperConnection,
    });
  },
  async restoreDatabase(connection, settings, runner) {
    assertLocalLibsqlConnection(connection);
    return restoreWithSqliteDumper(this, connection, settings, runner, {
      product: 'LibSQL',
      createDumperConnection: createLibsqlDumperConnection,
    });
  },
  // @ts-ignore
  async query(dbhan, sql) {
    const stmt = dbhan.client.prepare(sql);

    const rows = stmt.all();
    const stmtColumns = stmt.columns();
    const columns = stmtColumns.length > 0 ? stmtColumns : extractColumns(rows[0]);

    return {
      rows: rows.map((row) => modifyRow(row, columns)),
      columns: columns.map((col) => ({
        columnName: col.name,
        dataType: col.type,
        tableName: col.table || undefined,
        tableSchema: col.database || undefined,
        sourceColumnName: col.column || undefined,
      })),
    };
  },
  async stream(dbhan, sql, options) {
    const sqlSplitted = splitQuery(sql, sqliteSplitterOptions);

    const rowCounter = { count: 0, date: null };

    console.log('#stream', sql);
    const inTransaction = dbhan.client.transaction(() => {
      for (const sqlItem of sqlSplitted) {
        runStreamItem(dbhan, sqlItem, options, rowCounter, driverBases[1].engine);
      }

      if (rowCounter.date) {
        options.info({
          message: `${rowCounter.count} rows affected`,
          time: new Date(),
          severity: 'info',
          rowsAffected: rowCounter.count,
        });
      }
    });

    try {
      inTransaction();
    } catch (error) {
      logger.error(extractErrorLogData(error), 'DBGM-00202 Stream error');
      const { message, procName } = error;
      options.info({
        message,
        line: 0,
        procedure: procName,
        time: new Date(),
        severity: 'error',
      });
    }

    options.done();
    // return stream;
  },
  async script(dbhan, sql, { useTransaction } = {}) {
    const runScript = () => {
      for (const sqlItem of splitQuery(sql, this.getQuerySplitterOptions('script'))) {
        const stmt = dbhan.client.prepare(sqlItem);
        stmt.run();
      }
    };

    if (useTransaction) {
      dbhan.client.transaction(() => {
        runScript();
      })();
    } else {
      runScript();
    }
  },

  async readQueryTask(stmt, pass) {
    // let sent = 0;
    const columns = stmt.columns();
    for (const row of stmt.iterate()) {
      // sent++;
      if (!pass.write(modifyRow(row, columns))) {
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

    const stmt = dbhan.client.prepare(sql);
    const columns = stmt.columns();

    pass.write({
      __isStreamHeader: true,
      engine: driverBases[1].engine,
      ...(structure || {
        columns: columns.map((col) => ({
          columnName: col.name,
          dataType: col.type,
          tableName: col.table || undefined,
          tableSchema: col.database || undefined,
          sourceColumnName: col.column || undefined,
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
    const { rows } = await this.query(dbhan, 'select sqlite_version() as version');
    const { version } = rows[0];

    return {
      version,
      versionText: `SQLite ${version}`,
    };
  },

  getAuthTypes() {
    const res = [
      {
        title: 'File',
        name: 'file',
        disabledFields: ['databaseUrl', 'authToken'],
      },
      {
        title: 'URL',
        name: 'url',
        disabledFields: ['databaseFile'],
      },
    ];

    return res;
  },
};

module.exports = libsqlDriver;
