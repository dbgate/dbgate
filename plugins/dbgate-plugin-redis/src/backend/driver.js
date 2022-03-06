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
        const text = keySplit[rootSplit.length];
        if (keySplit.length == rootSplit.length + 1) {
          res[text] = {
            text,
            key,
          };
        } else {
          const dctKey = '::' + text;
          if (res[dctKey]) {
            res[dctKey].count++;
          } else {
            res[dctKey] = {
              text: text + ':*',
              type: 'dir',
              root: keySplit.slice(0, rootSplit.length + 1).join(':'),
              count: 1,
            };
          }
        }
      }
    }
    return Object.values(res);
  },

  async getKeyCardinality(pool, key, type) {
    switch (type) {
      case 'list':
        return pool.llen(key);
      case 'set':
        return pool.scard(key);
      case 'zset':
        return pool.zcard(key);
      case 'stream':
        return pool.xlen(key);
      case 'hash':
        return pool.hlen(key);
    }
  },

  async enrichOneKeyInfo(pool, item) {
    item.type = await pool.type(item.key);
    item.count = await this.getKeyCardinality(pool, item.key, item.type);
  },

  async enrichKeyInfo(pool, levelInfo) {
    await async.eachLimit(
      levelInfo.filter((x) => x.key),
      10,
      async (item) => await this.enrichOneKeyInfo(pool, item)
    );
  },

  async loadKeyInfo(pool, key) {
    const res = {};
    const type = await pool.type(key);

    res.key = key;
    res.type = type;
    res.ttl = await pool.ttl(key);
    res.count = await this.getKeyCardinality(pool, key, type);

    switch (type) {
      case 'string':
        res.value = await pool.get(key);
        break;
      case 'list':
        res.tableColumns = ['value'];
        break;
      case 'set':
        res.tableColumns = ['value'];
        res.keyColumn = 'value';
        break;
      case 'zset':
        res.tableColumns = ['value', 'score'];
        res.keyColumn = 'value';
        break;
      case 'hash':
        res.tableColumns = ['key', 'value'];
        res.keyColumn = 'key';
        break;
    }

    return res;
  },

  async loadKeyTableRange(pool, key, cursor, count) {
    const type = await pool.type(key);
    switch (type) {
      case 'list': {
        const res = await pool.lrange(key, cursor, start + count);
        return {
          cursor: res.length > count ? cursor + count : 0,
          items: res.map((value) => ({ value })).slice(0, count),
        };
      }
      case 'set': {
        const res = await pool.sscan(key, cursor, 'COUNT', count);
        return {
          cursor: parseInt(res[0]),
          items: res[1].map((value) => ({ value })),
        };
      }
      case 'zset': {
        const res = await pool.zscan(key, cursor, 'COUNT', count);
        return {
          cursor: parseInt(res[0]),
          items: _.chunk(res[1], 2).map((item) => ({ value: item[0], score: item[1] })),
        };
      }
      case 'hash': {
        const res = await pool.hscan(key, cursor, 'COUNT', count);
        return {
          cursor: parseInt(res[0]),
          items: _.chunk(res[1], 2).map((item) => ({ key: item[0], value: item[1] })),
        };
      }
    }
    return null;
  },
};

module.exports = driver;
