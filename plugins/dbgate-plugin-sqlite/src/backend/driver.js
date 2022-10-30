const _ = require('lodash');
const stream = require('stream');
const driverBase = require('../frontend/driver');
const Analyser = require('./Analyser');
const { splitQuery, sqliteSplitterOptions } = require('dbgate-query-splitter');
const { createBulkInsertStreamBase, makeUniqueColumnNames } = require('dbgate-tools');

let Database;

async function waitForDrain(stream) {
  return new Promise((resolve) => {
    stream.once('drain', () => {
      // console.log('CONTINUE DRAIN');
      resolve();
    });
  });
}

function runStreamItem(client, sql, options, rowCounter) {
  const stmt = client.prepare(sql);
  if (stmt.reader) {
    const columns = stmt.columns();
    // const rows = stmt.all();

    options.recordset(
      columns.map((col) => ({
        columnName: col.name,
        dataType: col.type,
      }))
    );

    for (const row of stmt.iterate()) {
      options.row(row);
    }
  } else {
    const info = stmt.run();
    rowCounter.count += info.changes;
    if (!rowCounter.date) rowCounter.date = new Date().getTime();
    if (new Date().getTime() > rowCounter.date > 1000) {
      options.info({
        message: `${rowCounter.count} rows affected`,
        time: new Date(),
        severity: 'info',
      });
      rowCounter.count = 0;
      rowCounter.date = null;
    }
  }
}

/** @type {import('dbgate-types').EngineDriver} */
const driver = {
  ...driverBase,
  analyserClass: Analyser,
  async connect({ databaseFile, isReadOnly }) {
    const pool = new Database(databaseFile, { readonly: !!isReadOnly });
    return pool;
  },
  async close(pool) {
    return pool.close();
  },
  // @ts-ignore
  async query(pool, sql) {
    const stmt = pool.prepare(sql);
    // stmt.raw();
    if (stmt.reader) {
      const columns = stmt.columns();
      const rows = stmt.all();
      return {
        rows,
        columns: columns.map((col) => ({
          columnName: col.name,
          dataType: col.type,
        })),
      };
    } else {
      stmt.run();
      return {
        rows: [],
        columns: [],
      };
    }
  },
  async stream(client, sql, options) {
    const sqlSplitted = splitQuery(sql, sqliteSplitterOptions);

    const rowCounter = { count: 0, date: null };

    const inTransaction = client.transaction(() => {
      for (const sqlItem of sqlSplitted) {
        runStreamItem(client, sqlItem, options, rowCounter);
      }

      if (rowCounter.date) {
        options.info({
          message: `${rowCounter.count} rows affected`,
          time: new Date(),
          severity: 'info',
        });
      }
    });

    try {
      inTransaction();
    } catch (error) {
      console.log('ERROR', error);
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
  async script(client, sql) {
    const inTransaction = client.transaction(() => {
      for (const sqlItem of splitQuery(sql, this.getQuerySplitterOptions('script'))) {
        const stmt = client.prepare(sqlItem);
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
  async readQuery(pool, sql, structure) {
    const pass = new stream.PassThrough({
      objectMode: true,
      highWaterMark: 100,
    });

    const stmt = pool.prepare(sql);
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
  async writeTable(pool, name, options) {
    return createBulkInsertStreamBase(this, stream, pool, name, options);
  },
  async getVersion(pool) {
    const { rows } = await this.query(pool, 'select sqlite_version() as version');
    const { version } = rows[0];

    return {
      version,
      versionText: `SQLite ${version}`,
    };
  },
};

driver.initialize = (dbgateEnv) => {
  if (dbgateEnv.nativeModules && dbgateEnv.nativeModules['better-sqlite3']) {
    Database = dbgateEnv.nativeModules['better-sqlite3']();
  }
};

module.exports = driver;
