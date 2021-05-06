const _ = require('lodash');
const stream = require('stream');
const driverBase = require('../frontend/driver');
const Analyser = require('./Analyser');
const { identify } = require('sql-query-identifier');

let Database;

async function runStreamItem(client, sql, options) {
  return new Promise((resolve, reject) => {
    try {
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

        resolve();
      } else {
        const info = stmt.run();
        options.info({
          message: `${info.changes} rows affected`,
          time: new Date(),
          severity: 'info',
        });
        resolve();
      }
    } catch (error) {
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
    }
  });
}

/** @type {import('dbgate-types').EngineDriver} */
const driver = {
  ...driverBase,
  analyserClass: Analyser,
  async connect({ databaseFile }) {
    const pool = new Database(databaseFile);
    return pool;
  },
  // @ts-ignore
  async query(pool, sql) {
    const stmt = pool.prepare(sql);
    // stmt.raw();
    const columns = stmt.columns();
    const rows = stmt.all();
    return {
      rows,
      columns: columns.map((col) => ({
        columnName: col.name,
        dataType: col.type,
      })),
    };
  },
  async stream(client, sql, options) {
    const sqlSplitted = identify(sql, { dialect: 'sqlite' });

    for (const sqlItem of sqlSplitted) {
      await runStreamItem(client, sqlItem.text, options);
    }

    options.done();
    // return stream;
  },
  async readQuery(pool, sql, structure) {
    const pass = new stream.PassThrough({
      objectMode: true,
      highWaterMark: 100,
    });

    // pass.write(structure)
    // pass.write(row1)
    // pass.write(row2)
    // pass.end()

    return pass;
  },
  async writeTable(pool, name, options) {
    return createBulkInsertStreamBase(this, stream, pool, name, options);
  },
  async getVersion(pool) {
    return { version: 'SQLite 3' };
  },
};

driver.initialize = (dbgateEnv) => {
  if (dbgateEnv.nativeModules && dbgateEnv.nativeModules['better-sqlite3']) {
    Database = dbgateEnv.nativeModules['better-sqlite3']();
  }
};

module.exports = driver;
