const _ = require('lodash');
const async = require('async');
const stream = require('stream');
const driverBase = require('../frontend/driver');
const Analyser = require('./Analyser');
const Redis = require('ioredis');
const RedisDump = require('node-redis-dump2');
const { filterName } = global.DBGATE_PACKAGES['dbgate-tools'];

let isProApp;

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

async function buildNatMapFromSeeds(seeds, redisOptions) {
  const natMap = {};

  await Promise.all(
    seeds.map(async (seed) => {
      const single = new Redis({
        host: typeof seed === 'string' ? new URL(seed).hostname : seed.host,
        port: typeof seed === 'string' ? Number(new URL(seed).port || 6379) : seed.port,
        ...redisOptions,
        // Make these connections quick and disposable
        lazyConnect: false,
        enableReadyCheck: false,
        maxRetriesPerRequest: 0,
      });

      try {
        const nodes = await single.cluster('nodes'); // text blob
        const line = nodes.split(/\r?\n/).find((l) => /\bmyself\b/.test(l));
        if (!line) return;

        // Example addr token: "172.18.0.3:6379@16379" or "redis-node-0:6379@16379"
        const addrToken = line.split(' ')[1];
        const hostPort = addrToken.split('@')[0]; // strip bus port
        const [advHost, advPortStr] = hostPort.split(':');
        const advKey = `${advHost}:${Number(advPortStr)}`;

        const extHost = typeof seed === 'string' ? new URL(seed).hostname : seed.host;
        const extPort = typeof seed === 'string' ? Number(new URL(seed).port || 6379) : seed.port;

        natMap[advKey] = { host: extHost, port: extPort };
      } catch {
        // ignore this seed if it fails; others may still succeed
      } finally {
        single.disconnect();
      }
    })
  );

  return natMap;
}

/** @type {import('dbgate-types').EngineDriver} */
const driver = {
  ...driverBase,
  analyserClass: Analyser,
  async connect({
    server,
    port,
    user,
    password,
    database,
    useDatabaseUrl,
    databaseUrl,
    treeKeySeparator,
    ssl,
    skipSetName,
    authType,
    clusterNodes,
    autoDetectNatMap,
  }) {
    let db = 0;
    let client;
    if (useDatabaseUrl) {
      client = new Redis(databaseUrl);
      if (!skipSetName) {
        await client.client('SETNAME', 'dbgate');
      }
    } else if (authType === 'cluster' && isProApp && isProApp()) {
      const redisOptions = {
        user,
        password,
      };

      let seeds = [];
      try {
        seeds = JSON.parse(clusterNodes);
      } catch {}
      if (!Array.isArray(seeds) || seeds.length === 0) {
        throw new Error('Cluster nodes must be a non-empty array of host:port or objects with host and port');
      }

      const natMap = autoDetectNatMap ? await buildNatMapFromSeeds(seeds, redisOptions) : undefined;

      client = new Redis.Cluster(seeds, {
        redisOptions,
        natMap,
      });
    } else {
      if (_.isString(database) && database.startsWith('db')) db = parseInt(database.substring(2));
      if (_.isNumber(database)) db = database;
      if (ssl) {
        ssl = {
          ..._.omit(ssl, ['rejectUnauthorized', 'password']),
          passphrase: ssl.password,
        };
      }
      const connectionOptions = {
        host: server,
        port,
        username: user,
        password,
        db,
        tls: ssl,
      };
      if (!skipSetName) {
        connectionOptions.connectionName = 'dbgate';
      }
      client = new Redis(connectionOptions);
    }

    return {
      client,
      treeKeySeparator: treeKeySeparator || ':',
    };
  },
  // @ts-ignore
  async query(dbhan, sql) {
    const parts = splitCommandLine(sql);

    if (parts.length >= 1) {
      const command = parts[0].toLowerCase();
      const args = parts.slice(1);
      await dbhan.client.call(command, ...args);
    }

    // redis queries don't return rows
    return {
      rows: [],
      columns: [],
    };
  },
  async stream(dbhan, sql, options) {
    const parts = splitCommandLine(sql);
    if (parts.length < 1) {
      options.done();
      return;
    }
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    const res = await dbhan.client.call(command, ...args);

    options.info({
      message: JSON.stringify(res),
      time: new Date(),
      severity: 'info',
    });

    options.done();
  },
  async readQuery(dbhan, sql, structure) {
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
  async writeTable(dbhan, name, options) {
    return createBulkInsertStreamBase(this, stream, dbhan, name, options);
  },
  async info(dbhan) {
    const info = await dbhan.client.info();
    return _.fromPairs(
      info
        .split('\n')
        .filter((x) => x.trim() && !x.trim().startsWith('#'))
        .map((x) => x.split(':'))
    );
  },
  async getVersion(dbhan) {
    const info = await this.info(dbhan);

    return {
      version: info.redis_version,
      versionText: `Redis ${info.redis_version}`,
    };
  },
  async listDatabases(dbhan) {
    const info = await this.info(dbhan);

    let databaseCount = 16;
    try {
      const configResult = await dbhan.client.config('GET', 'databases');
      if (Array.isArray(configResult) && configResult.length >= 2) {
        databaseCount = parseInt(configResult[1], 10) || 16;
      }
    } catch {}

    return _.range(databaseCount).map((index) => ({
      name: `db${index}`,
      extInfo: info[`db${index}`],
      sortOrder: index,
    }));
  },

  async scanKeys(dbhan, pattern, cursor = 0, count) {
    const match = pattern?.match(/[\?\[\{]/) ? pattern : pattern ? `*${pattern}*` : '*';
    const [nextCursor, keys] = await dbhan.client.scan(cursor, 'MATCH', match, 'COUNT', count ?? 2 ** 32);
    const dbsize = await dbhan.client.dbsize();
    const keysMapped = keys.map((key) => ({
      key,
    }));
    await this.enrichKeyInfo(dbhan, keysMapped);
    return {
      nextCursor,
      keys: keysMapped,
      dbsize,
    };
  },

  async loadKeys(dbhan, root = '', filter = null, limit = null) {
    const keys = await this.getKeys(dbhan, root ? `${root}${dbhan.treeKeySeparator}*` : '*');
    const keysFiltered = keys.filter((x) => filterName(filter, x));
    const keysSorted = _.sortBy(keysFiltered, 'text');
    const res = this.extractKeysFromLevel(dbhan, root, keysSorted);
    const resLimited = limit ? res.slice(0, limit) : res;
    await this.enrichKeyInfo(dbhan, resLimited);
    return resLimited;
  },

  async exportKeys(dbhan, options) {
    const dump = new RedisDump({ client: dbhan.client });
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

  async getKeys(dbhan, keyQuery = '*') {
    const stream = dbhan.client.scanStream({
      match: keyQuery,
      count: 1000,
    });

    const keys = [];

    stream.on('data', (resultKeys) => {
      for (const key of resultKeys) {
        keys.push(key);
      }
    });

    return new Promise((resolve, reject) => {
      stream.on('end', () => {
        resolve(keys);
      });
      stream.on('error', (err) => {
        reject(err);
      });
    });

    // const res = [];
    // let cursor = 0;
    // do {
    //   const [strCursor, keys] = await dbhan.client.scan(cursor, 'MATCH', keyQuery, 'COUNT', 100);
    //   res.push(...keys);
    //   cursor = parseInt(strCursor);
    // } while (cursor > 0);
    // return res;
  },

  extractKeysFromLevel(dbhan, root, keys) {
    const prefix = root ? `${root}${dbhan.treeKeySeparator}` : '';
    const rootSplit = root == '' ? [] : root.split(dbhan.treeKeySeparator);
    const res = {};
    for (const key of keys) {
      if (!key.startsWith(prefix)) continue;
      const keySplit = key.split(dbhan.treeKeySeparator);
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
              text: text + dbhan.treeKeySeparator + '*',
              type: 'dir',
              root: keySplit.slice(0, rootSplit.length + 1).join(dbhan.treeKeySeparator),
              count: 1,
            };
          }
        }
      }
    }
    return Object.values(res);
  },

  async getKeyCardinality(dbhan, key, type) {
    switch (type) {
      case 'list':
        return dbhan.client.llen(key);
      case 'set':
        return dbhan.client.scard(key);
      case 'zset':
        return dbhan.client.zcard(key);
      case 'stream':
        return dbhan.client.xlen(key);
      case 'hash':
        return dbhan.client.hlen(key);
    }
  },

  // async enrichOneKeyInfo(dbhan, item) {
  //   item.type = await dbhan.client.type(item.key);
  //   item.count = await this.getKeyCardinality(dbhan, item.key, item.type);
  // },

  async enrichKeyInfo(dbhan, keyObjects) {
    // 1. get type
    const typePipeline = dbhan.client.pipeline();
    for (const item of keyObjects) {
      typePipeline.type(item.key);
    }
    const resultType = await typePipeline.exec();
    for (let i = 0; i < resultType.length; i++) {
      if (resultType[i][0] == null) {
        keyObjects[i].type = resultType[i][1];
      }
    }

    // 2. get cardinality
    const cardinalityPipeline = dbhan.client.pipeline();
    for (const item of keyObjects) {
      switch (item.type) {
        case 'list':
          cardinalityPipeline.llen(item.key);
        case 'set':
          cardinalityPipeline.scard(item.key);
        case 'zset':
          cardinalityPipeline.zcard(item.key);
        case 'stream':
          cardinalityPipeline.xlen(item.key);
        case 'hash':
          cardinalityPipeline.hlen(item.key);
      }
    }
    const resultCardinality = await cardinalityPipeline.exec();
    let resIndex = 0;
    for (const item of keyObjects) {
      if (
        item.type == 'list' ||
        item.type == 'set' ||
        item.type == 'zset' ||
        item.type == 'stream' ||
        item.type == 'hash'
      ) {
        if (resultCardinality[resIndex][0] == null) {
          item.count = resultCardinality[resIndex][1];
          resIndex++;
        }
      }
    }
  },

  async loadKeyInfo(dbhan, key) {
    const res = {};
    const type = await dbhan.client.type(key);

    res.key = key;
    res.type = type;
    res.ttl = await dbhan.client.ttl(key);
    res.count = await this.getKeyCardinality(dbhan, key, type);

    switch (type) {
      case 'string':
        res.value = await dbhan.client.get(key);
        break;
      case 'ReJSON-RL':
        res.type = 'JSON';
        try {
          const jsonData = await dbhan.client.call('JSON.GET', key);
          res.value = JSON.stringify(JSON.parse(jsonData), null, 2);
        } catch (e) {
          res.value = '';
        }
        break;
    }

    return res;
  },

  async deleteBranch(dbhan, keyQuery) {
    const keys = await this.getKeys(dbhan, keyQuery);
    const keysChunked = _.chunk(keys, 10);
    await async.eachLimit(keysChunked, 10, async (keysChunk) => await dbhan.client.del(...keysChunk));
  },

  async callMethod(dbhan, method, args) {
    switch (method) {
      case 'mdel':
        return await this.deleteBranch(dbhan, args[0]);
      // case 'zadd':
      //   return await dbhan.client.zadd(args[0], args[2], args[1]);
      // case 'json.set':
      //   return await dbhan.client.call('JSON.SET', args[0], '$', args[1]);
      // case 'xaddjson':
      //   let json;
      //   try {
      //     json = JSON.parse(args[2]);
      //   } catch (e) {
      //     throw new Error('Value must be valid JSON. ' + e.message);
      //   }
      //   return await dbhan.client.xadd(args[0], args[1] || '*', ..._.flatten(_.toPairs(json)));
    }
    return await dbhan.client[method](...args);
  },

  async loadKeyTableRange(dbhan, key, cursor, count) {
    const type = await dbhan.client.type(key);
    switch (type) {
      case 'list': {
        const res = await dbhan.client.lrange(key, cursor, cursor + count);
        return {
          cursor: res.length > count ? cursor + count : 0,
          items: res.map((value) => ({ value })).slice(0, count),
        };
      }
      case 'set': {
        const res = await dbhan.client.sscan(key, cursor, 'COUNT', count);
        return {
          cursor: parseInt(res[0]),
          items: res[1].map((value) => ({ value })),
        };
      }
      case 'zset': {
        const res = await dbhan.client.zscan(key, cursor, 'COUNT', count);
        return {
          cursor: parseInt(res[0]),
          items: _.chunk(res[1], 2).map((item) => ({ member: item[0], score: item[1] })),
        };
      }
      case 'hash': {
        const res = await dbhan.client.hscan(key, cursor, 'COUNT', count);
        const fields = _.chunk(res[1], 2);

        // Get TTL for each hash field (Redis 7.4+)
        const items = await Promise.all(
          fields.map(async ([fieldKey, fieldValue]) => {
            try {
              const ttl = await dbhan.client.call('HTTL', key, 'FIELDS', 1, fieldKey);
              return { key: fieldKey, value: fieldValue, ttl: ttl && ttl[0] !== undefined ? ttl[0] : null };
            } catch (e) {
              return { key: fieldKey, value: fieldValue };
            }
          })
        );

        return {
          cursor: parseInt(res[0]),
          items,
        };
      }
      case 'stream': {
        const res = await dbhan.client.xrange(key, cursor == 0 ? '-' : cursor, '+', 'COUNT', count);
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

  async close(dbhan) {
    return dbhan.client.quit();
  },

  getAuthTypes() {
    if (isProApp && isProApp()) {
      return [
        { name: 'node', title: 'Single Redis node' },
        { name: 'cluster', title: 'Redis Cluster' },
      ];
    }
    return null;
  },

  async invokeMethodCallList(dbhan, callList) {
    const pipeline = dbhan.client.pipeline();
    for (const call of callList.calls) {
      pipeline.call(call.method, ...call.args);
    }
    await pipeline.exec();
  },
};

driver.initialize = (dbgateEnv) => {
  isProApp = dbgateEnv.isProApp;
};

module.exports = driver;
