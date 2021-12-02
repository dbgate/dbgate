const _ = require('lodash');
const stream = require('stream');
const isPromise = require('is-promise');
const driverBase = require('../frontend/driver');
const Analyser = require('./Analyser');
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const Cursor = require('mongodb').Cursor;
const createBulkInsertStream = require('./createBulkInsertStream');

function readCursor(cursor, options) {
  return new Promise((resolve) => {
    options.recordset({ __isDynamicStructure: true });

    cursor.on('data', (data) => options.row(data));
    cursor.on('end', () => resolve());
  });
}

const mongoIdRegex = /^[0-9a-f]{24}$/;
function convertConditionInternal(condition) {
  if (condition && _.isString(condition._id) && condition._id.match(mongoIdRegex)) {
    return {
      _id: ObjectId(condition._id),
    };
  }
  return condition;
}

function convertConditionUser(condition) {
  return _.cloneDeepWith(condition, (x) => {
    if (x && x.$oid) return ObjectId(x.$oid);
  });
}

function findArrayResult(resValue) {
  if (!_.isPlainObject(resValue)) return null;
  const arrays = _.values(resValue).filter((x) => _.isArray(x));
  if (arrays.length == 1) return arrays[0];
  return null;
}

async function getScriptableDb(pool) {
  const db = pool.__getDatabase();
  const collections = await db.listCollections().toArray();
  for (const collection of collections) {
    db[collection.name] = db.collection(collection.name);
  }
  return db;
}

/** @type {import('dbgate-types').EngineDriver} */
const driver = {
  ...driverBase,
  analyserClass: Analyser,
  async connect({ server, port, user, password, database, useDatabaseUrl, databaseUrl, ssl }) {
    // let mongoUrl = databaseUrl;
    // if (!useDatabaseUrl) {
    //   mongoUrl = user ? `mongodb://${user}:${password}@${server}:${port}` : `mongodb://${server}:${port}`;
    //   if (database) mongoUrl += '/' + database;
    // }
    const mongoUrl = useDatabaseUrl
      ? databaseUrl
      : user
      ? `mongodb://${user}:${password}@${server}:${port}`
      : `mongodb://${server}:${port}`;

    const options = {};
    if (ssl) {
      options.tls = true;
      options.tlsCAFile = ssl.ca;
      options.tlsCertificateKeyFile = ssl.cert || ssl.key;
      options.tlsCertificateKeyFilePassword = ssl.password;
      options.tlsAllowInvalidCertificates = !ssl.rejectUnauthorized;
    }

    const pool = new MongoClient(mongoUrl, options);
    await pool.connect();
    // const pool = await MongoClient.connect(mongoUrl);
    pool.__getDatabase = database ? () => pool.db(database) : () => pool.db();
    pool.__databaseName = database;
    return pool;
  },
  // @ts-ignore
  async query(pool, sql) {
    return {
      rows: [],
      columns: [],
    };
  },
  async script(pool, sql) {
    let func;
    func = eval(`(db,ObjectId) => { ${sql} }`);
    const db = await getScriptableDb(pool);
    func(db, ObjectId);
  },
  async stream(pool, sql, options) {
    let func;
    try {
      func = eval(`(db,ObjectId) => ${sql}`);
    } catch (err) {
      options.info({
        message: 'Error compiling expression: ' + err.message,
        time: new Date(),
        severity: 'error',
      });
      options.done();
      return;
    }
    const db = await getScriptableDb(pool);

    let exprValue;
    try {
      exprValue = func(db, ObjectId);
    } catch (err) {
      options.info({
        message: 'Error evaluating expression: ' + err.message,
        time: new Date(),
        severity: 'error',
      });
      options.done();
      return;
    }

    if (exprValue instanceof Cursor) {
      await readCursor(exprValue, options);
    } else if (isPromise(exprValue)) {
      try {
        const resValue = await exprValue;

        options.info({
          message: 'Command succesfully executed',
          time: new Date(),
          severity: 'info',
        });
        options.info({
          message: JSON.stringify(resValue),
          time: new Date(),
          severity: 'info',
        });

        const arrayRes = findArrayResult(resValue);
        if (arrayRes) {
          options.recordset({ __isDynamicStructure: true });
          for (const row of arrayRes) {
            options.row(row);
          }
        }
      } catch (err) {
        options.info({
          message: 'Error when running command: ' + err.message,
          time: new Date(),
          severity: 'error',
        });
      }
    }

    options.done();
  },
  async readQuery(pool, sql, structure) {
    try {
      const json = JSON.parse(sql);
      if (json && json.pureName) {
        sql = `db.${json.pureName}.find()`;
      }
    } catch (err) {
      // query is not JSON serialized collection name
    }

    // const pass = new stream.PassThrough({
    //   objectMode: true,
    //   highWaterMark: 100,
    // });

    func = eval(`(db,ObjectId) => ${sql}`);
    const db = await getScriptableDb(pool);
    exprValue = func(db, ObjectId);

    // return directly stream without header row
    return exprValue;

    // pass.write(structure || { __isDynamicStructure: true });
    // exprValue.on('data', (row) => pass.write(row));
    // exprValue.on('end', () => pass.end());

    // return pass;
  },
  async writeTable(pool, name, options) {
    return createBulkInsertStream(this, stream, pool, name, options);
  },
  async getVersion(pool) {
    const status = await pool.__getDatabase().admin().serverInfo();
    return {
      ...status,
      versionText: `MongoDB ${status.version}`,
    };
  },
  async listDatabases(pool) {
    const res = await pool.__getDatabase().admin().listDatabases();
    return res.databases;
  },
  async readCollection(pool, options) {
    try {
      const collection = pool.__getDatabase().collection(options.pureName);
      if (options.countDocuments) {
        const count = await collection.countDocuments(convertConditionUser(options.condition) || {});
        return { count };
      } else {
        // console.log('options.condition', JSON.stringify(options.condition, undefined, 2));
        let cursor = await collection.find(convertConditionUser(options.condition) || {});
        if (options.sort) cursor = cursor.sort(options.sort);
        if (options.skip) cursor = cursor.skip(options.skip);
        if (options.limit) cursor = cursor.limit(options.limit);
        const rows = await cursor.toArray();
        return { rows };
      }
    } catch (err) {
      return { errorMessage: err.message };
    }
  },
  async updateCollection(pool, changeSet) {
    const res = {
      inserted: [],
      updated: [],
      deleted: [],
      replaced: [],
    };
    try {
      const db = pool.__getDatabase();
      for (const insert of changeSet.inserts) {
        const collection = db.collection(insert.pureName);
        const document = {
          ...insert.document,
          ...insert.fields,
        };
        const resdoc = await collection.insert(document);
        res.inserted.push(resdoc._id);
      }
      for (const update of changeSet.updates) {
        const collection = db.collection(update.pureName);
        if (update.document) {
          const document = {
            ...update.document,
            ...update.fields,
          };
          const doc = await collection.findOne(convertConditionInternal(update.condition));
          if (doc) {
            const resdoc = await collection.replaceOne(convertConditionInternal(update.condition), {
              ...document,
              _id: doc._id,
            });
            res.replaced.push(resdoc._id);
          }
        } else {
          const resdoc = await collection.updateOne(convertConditionInternal(update.condition), {
            $set: update.fields,
          });
          res.updated.push(resdoc._id);
        }
      }
      for (const del of changeSet.deletes) {
        const collection = db.collection(del.pureName);
        const resdoc = await collection.deleteOne(convertConditionInternal(del.condition));
        res.deleted.push(resdoc._id);
      }
      return res;
    } catch (err) {
      return { errorMessage: err.message };
    }
  },

  async createDatabase(pool, name) {
    const db = pool.db(name);
    await db.createCollection('collection1');
  },
};

module.exports = driver;
