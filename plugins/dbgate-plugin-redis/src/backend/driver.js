const _ = require('lodash');
const async = require('async');
const stream = require('stream');
const driverBase = require('../frontend/driver');
const Analyser = require('./Analyser');
const Redis = require('ioredis');
const RedisDump = require('node-redis-dump2');
const { filterName } = require('dbgate-tools');

function splitCommandLine(str) {
  let results = [];
  let word = '';
  let validWord;
  for (let i = 0; i < str.length; ) {
    if (/\s/.test(str[i])) {
      //Skips spaces.
      while (i < str.length && /\s/.test(str[i])) {
        i++;
      }
      results.push(word);
      word = '';
      validWord = false;
      continue;
    }

    if (str[i] === '"') {
      i++;
      while (i < str.length) {
        if (str[i] === '"') {
          validWord = true;
          break;
        }

        if (str[i] === '\\') {
          i++;
          word += str[i++];
          continue;
        }

        word += str[i++];
      }
      i++;
      continue;
    }

    if (str[i] === "'") {
      i++;
      while (i < str.length) {
        if (str[i] === "'") {
          validWord = true;
          break;
        }

        if (str[i] === '\\') {
          i++;
          word += str[i++];
          continue;
        }

        word += str[i++];
      }
      i++;
      continue;
    }

    if (str[i] === '\\') {
      i++;
      word += str[i++];
      continue;
    }
    validWord = true;
    word += str[i++];
  }
  if (validWord) {
    results.push(word);
  }
  return results;
}

/** @type {import('dbgate-types').EngineDriver} */
const driver = {
  ...driverBase,
  analyserClass: Analyser,
  async connect({ server, port, user, password, database, useDatabaseUrl, databaseUrl, treeKeySeparator }) {
    let db = 0;
    let pool;
    if (useDatabaseUrl) {
      pool = new Redis(databaseUrl);
    } else {
      if (_.isString(database) && database.startsWith('db')) db = parseInt(database.substring(2));
      if (_.isNumber(database)) db = database;
      pool = new Redis({
        host: server,
        port,
        username: user,
        password,
        db,
      });
      pool.__treeKeySeparator = treeKeySeparator || ':';
    }

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
    const parts = splitCommandLine(sql);
    if (parts.length < 1) {
      options.done();
      return;
    }
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    const res = await pool.call(command, ...args);

    options.info({
      message: JSON.stringify(res),
      time: new Date(),
      severity: 'info',
    });

    options.done();
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

    return {
      version: info.redis_version,
      versionText: `Redis ${info.redis_version}`,
    };
  },
  async listDatabases(pool) {
    const info = await this.info(pool);

    return _.range(16).map((index) => ({ name: `db${index}`, extInfo: info[`db${index}`], sortOrder: index }));
  },

  async loadKeys(pool, root = '', filter = null) {
    const keys = await this.getKeys(pool, root ? `${root}${pool.__treeKeySeparator}*` : '*');
    const keysFiltered = keys.filter((x) => filterName(filter, x));
    const res = this.extractKeysFromLevel(pool, root, keysFiltered);
    await this.enrichKeyInfo(pool, res);
    return res;
  },

  async exportKeys(pool, options) {
    const dump = new RedisDump({ client: pool });
    return new Promise((resolve, reject) => {
      dump.export({
        type: 'redis',
        keyPrefix: options.keyPrefix,
        callback: (err, data) => {
          if (err) reject(err);
          else resolve(data);
        },
      });
    });
  },

  async getKeys(pool, keyQuery = '*') {
    const res = [];
    let cursor = 0;
    do {
      const [strCursor, keys] = await pool.scan(cursor, 'MATCH', keyQuery, 'COUNT', 100);
      res.push(...keys);
      cursor = parseInt(strCursor);
    } while (cursor > 0);
    return res;
  },

  extractKeysFromLevel(pool, root, keys) {
    const prefix = root ? `${root}${pool.__treeKeySeparator}` : '';
    const rootSplit = _.compact(root.split(pool.__treeKeySeparator));
    const res = {};
    for (const key of keys) {
      if (!key.startsWith(prefix)) continue;
      const keySplit = key.split(pool.__treeKeySeparator);
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
              text: text + pool.__treeKeySeparator + '*',
              type: 'dir',
              root: keySplit.slice(0, rootSplit.length + 1).join(pool.__treeKeySeparator),
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
      // case 'list':
      //   res.tableColumns = [{ name: 'value' }];
      //   res.addMethod = 'rpush';
      //   break;
      // case 'set':
      //   res.tableColumns = [{ name: 'value' }];
      //   res.keyColumn = 'value';
      //   res.addMethod = 'sadd';
      //   break;
      // case 'zset':
      //   res.tableColumns = [{ name: 'score' }, { name: 'value' }];
      //   res.keyColumn = 'value';
      //   res.addMethod = 'zadd';
      //   break;
      // case 'hash':
      //   res.tableColumns = [{ name: 'key' }, { name: 'value' }];
      //   res.keyColumn = 'key';
      //   res.addMethod = 'hset';
      //   break;
    }

    res.keyType = this.supportedKeyTypes.find((x) => x.name == type);

    return res;
  },

  async deleteBranch(pool, keyQuery) {
    const keys = await this.getKeys(pool, keyQuery);
    const keysChunked = _.chunk(keys, 10);
    await async.eachLimit(keysChunked, 10, async (keysChunk) => await pool.del(...keysChunk));
  },

  async callMethod(pool, method, args) {
    switch (method) {
      case 'mdel':
        return await this.deleteBranch(pool, args[0]);
      case 'xaddjson':
        let json;
        try {
          json = JSON.parse(args[2]);
        } catch (e) {
          throw new Error('Value must be valid JSON. ' + e.message);
        }
        return await pool.xadd(args[0], args[1] || '*', ..._.flatten(_.toPairs(json)));
    }
    return await pool[method](...args);
  },

  async loadKeyTableRange(pool, key, cursor, count) {
    const type = await pool.type(key);
    switch (type) {
      case 'list': {
        const res = await pool.lrange(key, cursor, cursor + count);
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
      case 'stream': {
        const res = await pool.xrange(key, cursor == 0 ? '-' : cursor, '+', 'COUNT', count);
        let newCursor = 0;
        if (res.length > 0) {
          const id = res[res.length - 1][0];
          const idParts = id.split('-');
          newCursor = `${idParts[0]}-${parseInt(idParts[1] + 1)}`;
        }
        return {
          cursor: newCursor,
          items: res.map(([id, vals]) => ({
            id,
            value: JSON.stringify(_.fromPairs(_.chunk(vals, 2)), undefined, 2),
          })),
        };
      }
    }
    return null;
  },
};

module.exports = driver;
