const _ = require('lodash');
const async = require('async');
const stream = require('stream');
const driverBase = require('../frontend/driver');
const Analyser = require('./Analyser');
const Redis = require('ioredis');

/** @type {import('dbgate-types').EngineDriver} */
const driver = {
  ...driverBase,
  analyserClass: Analyser,
  async connect({ server, port, password, database }) {
    let db = 0;
    if (_.isString(database) && database.startsWith('db')) db = parseInt(database.substring(2));
    if (_.isNumber(database)) db = database;
    const pool = new Redis({
      host: server,
      port,
      password,
      db,
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

  async loadKeys(pool, root = '') {
    const keys = await this.getKeys(pool, root);
    const res = this.extractKeysFromLevel(root, keys);
    await this.enrichKeyInfo(pool, res);
    return res;
  },

  async getKeys(pool, root = '') {
    const res = [];
    let cursor = 0;
    do {
      const [strCursor, keys] = await pool.scan(cursor, 'MATCH', root ? `${root}:*` : '*', 'COUNT', 100);
      res.push(...keys);
      cursor = parseInt(strCursor);
    } while (cursor > 0);
    return res;
  },

  extractKeysFromLevel(root, keys) {
    const prefix = root ? `${root}:` : '';
    const rootSplit = _.compact(root.split(':'));
    const res = {};
    for (const key of keys) {
      if (!key.startsWith(prefix)) continue;
      const keySplit = key.split(':');
      if (keySplit.length > rootSplit.length) {
        if (keySplit.length == rootSplit.length + 1) {
          res[keySplit[rootSplit.length]] = {
            text: keySplit[rootSplit.length],
            key,
          };
        } else {
          res[keySplit[rootSplit.length]] = {
            text: keySplit[rootSplit.length],
            type: 'dir',
            root: keySplit.slice(0, rootSplit.length + 1).join(':'),
          };
        }
      }
    }
    return Object.values(res);
  },

  async enrichOneKeyInfo(pool, item) {
    const type = await pool.type(item.key);
    item.type = type;
  },

  async enrichKeyInfo(pool, levelInfo) {
    await async.eachLimit(
      levelInfo.filter((x) => x.key),
      10,
      async (item) => await this.enrichOneKeyInfo(pool, item)
    );
  },
};

module.exports = driver;
