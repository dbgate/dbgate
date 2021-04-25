const _ = require('lodash');
const stream = require('stream');
const driverBase = require('../frontend/driver');
const Analyser = require('./Analyser');

let Database;

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
  async stream(pool, sql, options) {
    return null;
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
