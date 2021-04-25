const _ = require('lodash');
const stream = require('stream');
const driverBase = require('../frontend/driver');
const Analyser = require('./Analyser');

let sqlite3;

/** @type {import('dbgate-types').EngineDriver} */
const driver = {
  ...driverBase,
  analyserClass: Analyser,
  async connect({ server, port, user, password, database }) {
    const pool = new NativePool({
      server,
      port,
      user,
      password,
      database,
    });
    await pool.connect();
    return pool;
  },
  // @ts-ignore
  async query(pool, sql) {
    return {
      rows: [],
      columns: [],
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
    return { version: '1.0.0' };
  },
  async listDatabases(pool) {
    return [{ name: 'db1' }, { name: 'db2' }];
  },
};

driver.initialize = (dbgateEnv) => {
  if (dbgateEnv.nativeModules && dbgateEnv.nativeModules['better-sqlite3']) {
    sqlite3 = dbgateEnv.nativeModules['better-sqlite3']();
  }
};

module.exports = driver;
