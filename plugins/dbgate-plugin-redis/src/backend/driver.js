const _ = require('lodash');
const stream = require('stream');
const driverBase = require('../frontend/driver');
const Analyser = require('./Analyser');
const Redis = require('ioredis');

/** @type {import('dbgate-types').EngineDriver} */
const driver = {
  ...driverBase,
  analyserClass: Analyser,
  async connect({ server, port, password, database }) {
    const pool = new Redis({
      host: server,
      port,
      password,
      db: 0,
    });
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
  async info(pool) {
    const info = await pool.info();
    return _.fromPairs(
      info
        .split('\n')
        .filter((x) => x.trim() && !x.trim().startsWith('#'))
        .map((x) => x.split(':'))
    );
  },
  async getVersion(pool) {
    const info = await this.info(pool);

    return { version: info.redis_version };
  },
  async listDatabases(pool) {
    const info = await this.info(pool);

    return _.range(16).map((index) => ({ name: `db${index}`, extInfo: info[`db${index}`], sortOrder: index }));
  },
};

module.exports = driver;
