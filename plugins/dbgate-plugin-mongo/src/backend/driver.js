const _ = require('lodash');
const stream = require('stream');
const isPromise = require('is-promise');
const driverBase = require('../frontend/driver');
const Analyser = require('./Analyser');
const { MongoClient, ObjectId, AbstractCursor } = require('mongodb');
const { EJSON } = require('bson');
const createBulkInsertStream = require('./createBulkInsertStream');
const {
  convertToMongoCondition,
  convertToMongoAggregate,
  convertToMongoSort,
} = require('../frontend/convertToMongoCondition');

function transformMongoData(row) {
  return EJSON.serialize(row);
}

async function readCursor(cursor, options) {
  options.recordset({ __isDynamicStructure: true });
  await cursor.forEach((row) => {
    options.row(transformMongoData(row));
  });
}

function convertObjectId(condition) {
  return EJSON.deserialize(condition);
}

function findArrayResult(resValue) {
  if (!_.isPlainObject(resValue)) return null;
  const arrays = _.values(resValue).filter((x) => _.isArray(x));
  if (arrays.length == 1) return arrays[0];
  return null;
}

async function getScriptableDb(dbhan) {
  const db = dbhan.getDatabase();
  const collections = await db.listCollections().toArray();
  for (const collection of collections) {
    _.set(db, collection.name, db.collection(collection.name));
  }
  return db;
}

/** @type {import('dbgate-types').EngineDriver} */
const driver = {
  ...driverBase,
  analyserClass: Analyser,
  async connect({ server, port, user, password, database, useDatabaseUrl, databaseUrl, ssl, useSshTunnel }) {
    let mongoUrl;

    if (useDatabaseUrl) {
      if (useSshTunnel) {
        // change port to ssh tunnel port
        const url = new URL(databaseUrl);
        url.port = port;
        mongoUrl = url.href;
      } else {
        mongoUrl = databaseUrl;
      }
    } else {
      mongoUrl = user
        ? `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${server}:${port}`
        : `mongodb://${server}:${port}`;
    }

    const options = {
      // useUnifiedTopology: true, // this options has no longer effect
    };
    if (ssl) {
      options.tls = true;
      options.tlsCAFile = ssl.sslCaFile;
      options.tlsCertificateKeyFile = ssl.sslCertFile || ssl.sslKeyFile;
      options.tlsCertificateKeyFilePassword = ssl.password;
      // options.tlsAllowInvalidCertificates = !ssl.rejectUnauthorized;
      options.tlsInsecure = !ssl.rejectUnauthorized;
    }

    const client = new MongoClient(mongoUrl, options);
    await client.connect();
    return {
      client,
      database,
      getDatabase: database ? () => client.db(database) : () => client.db(),
    };
  },
  // @ts-ignore
  async query(dbhan, sql) {
    return {
      rows: [],
      columns: [],
    };
  },
  async script(dbhan, sql) {
    let func;
    func = eval(`(db,ObjectId) => ${sql}`);
    const db = await getScriptableDb(dbhan);
    const res = func(db, ObjectId.createFromHexString);
    if (isPromise(res)) await res;
  },
  async operation(dbhan, operation, options) {
    const { type } = operation;
    switch (type) {
      case 'createCollection':
        await this.script(dbhan, `db.createCollection('${operation.collection.name}')`);
        break;
      case 'dropCollection':
        await this.script(dbhan, `db.dropCollection('${operation.collection}')`);
        break;
      case 'renameCollection':
        await this.script(dbhan, `db.renameCollection('${operation.collection}', '${operation.newName}')`);
        break;
      case 'cloneCollection':
        await this.script(
          dbhan,
          `db.collection('${operation.collection}').aggregate([{$out: '${operation.newName}'}]).toArray()`
        );
        break;
      default:
        throw new Error(`Operation type ${type} not supported`);
    }
    // saveScriptToDatabase({ conid: connection._id, database: name }, `db.createCollection('${newCollection}')`);
  },
  async stream(dbhan, sql, options) {
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
    const db = await getScriptableDb(dbhan);

    let exprValue;
    try {
      exprValue = func(db, ObjectId.createFromHexString);
    } catch (err) {
      options.info({
        message: 'Error evaluating expression: ' + err.message,
        time: new Date(),
        severity: 'error',
      });
      options.done();
      return;
    }

    if (exprValue instanceof AbstractCursor) {
      await readCursor(exprValue, options);
    } else if (isPromise(exprValue)) {
      try {
        const resValue = await exprValue;

        options.info({
          message: 'Command succesfully executed',
          time: new Date(),
          severity: 'info',
        });
        try {
          options.info({
            message: `Result: ${JSON.stringify(resValue)}`,
            time: new Date(),
            severity: 'info',
          });
        } catch (err) {
          options.info({
            message: `Result: ${resValue}`,
            time: new Date(),
            severity: 'info',
          });
        }

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
  async startProfiler(dbhan, options) {
    const db = await getScriptableDb(dbhan);
    const old = await db.command({ profile: -1 });
    await db.command({ profile: 2 });
    const cursor = await db.collection('system.profile').find({
      ns: /^((?!(admin\.\$cmd|\.system|\.tmp\.)).)*$/,
      ts: { $gt: new Date() },
      'command.profile': { $exists: false },
      'command.collStats': { $exists: false },
      'command.collstats': { $exists: false },
      'command.createIndexes': { $exists: false },
      'command.listIndexes': { $exists: false },
      // "command.cursor": {"$exists": false},
      'command.create': { $exists: false },
      'command.dbstats': { $exists: false },
      'command.scale': { $exists: false },
      'command.explain': { $exists: false },
      'command.killCursors': { $exists: false },
      'command.count': { $ne: 'system.profile' },
      op: /^((?!(getmore|killcursors)).)/i,
    });

    cursor.addCursorFlag('tailable', true);
    cursor.addCursorFlag('awaitData', true);

    cursor
      .forEach((row) => {
        // console.log('ROW', row);
        options.row(row);
      })
      .catch((err) => {
        console.error('Cursor stopped with error:', err.message);
      });
    return {
      cursor,
      old,
    };
  },
  async stopProfiler(dbhan, { cursor, old }) {
    cursor.close();
    const db = await getScriptableDb(dbhan);
    await db.command({ profile: old.was, slowms: old.slowms });
  },
  async readQuery(dbhan, sql, structure) {
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
    const db = await getScriptableDb(dbhan);
    exprValue = func(db, ObjectId.createFromHexString);

    const pass = new stream.PassThrough({
      objectMode: true,
      highWaterMark: 100,
    });

    const cursorStream = exprValue.stream();

    cursorStream.on('data', (row) => {
      pass.write(transformMongoData(row));
    });

    // propagate error
    cursorStream.on('error', (err) => {
      pass.emit('error', err);
    });

    // Called once the cursor is fully read
    cursorStream.on('end', () => {
      pass.emit('end');
    });

    // exprValue
    //   .forEach((row) => pass.write(transformMongoData(row)))
    //   .then(() => {
    //     pass.end();
    //     // pass.end(() => {
    //     //   pass.emit('end');
    //     // })
    //   });

    return pass;
    // return directly stream without header row
    // return exprValue.stream();

    // pass.write(structure || { __isDynamicStructure: true });
    // exprValue.on('data', (row) => pass.write(row));
    // exprValue.on('end', () => pass.end());

    // return pass;
  },
  async writeTable(dbhan, name, options) {
    return createBulkInsertStream(this, stream, dbhan, name, options);
  },
  async getVersion(dbhan) {
    const status = await dbhan.getDatabase().admin().serverInfo();
    return {
      ...status,
      versionText: `MongoDB ${status.version}`,
    };
  },
  async listDatabases(dbhan) {
    const res = await dbhan.getDatabase().admin().listDatabases();
    return res.databases;
  },
  async readCollection(dbhan, options) {
    try {
      const mongoCondition = convertToMongoCondition(options.condition);
      // console.log('******************* mongoCondition *****************');
      // console.log(JSON.stringify(mongoCondition, undefined, 2));

      const collection = dbhan.getDatabase().collection(options.pureName);
      if (options.countDocuments) {
        const count = await collection.countDocuments(convertObjectId(mongoCondition) || {});
        return { count };
      } else if (options.aggregate) {
        let cursor = await collection.aggregate(convertObjectId(convertToMongoAggregate(options.aggregate)));
        const rows = await cursor.toArray();
        return {
          rows: rows.map(transformMongoData).map((x) => ({
            ...x._id,
            ..._.omit(x, ['_id']),
          })),
        };
      } else {
        // console.log('options.condition', JSON.stringify(options.condition, undefined, 2));
        let cursor = await collection.find(convertObjectId(mongoCondition) || {});
        if (options.sort) cursor = cursor.sort(convertToMongoSort(options.sort));
        if (options.skip) cursor = cursor.skip(options.skip);
        if (options.limit) cursor = cursor.limit(options.limit);
        const rows = await cursor.toArray();
        return {
          rows: rows.map(transformMongoData),
        };
      }
    } catch (err) {
      return { errorMessage: err.message };
    }
  },
  async updateCollection(dbhan, changeSet) {
    const res = {
      inserted: [],
      updated: [],
      deleted: [],
      replaced: [],
    };
    try {
      const db = dbhan.getDatabase();
      for (const insert of changeSet.inserts) {
        const collection = db.collection(insert.pureName);
        const document = {
          ...insert.document,
          ...insert.fields,
        };
        const resdoc = await collection.insertOne(convertObjectId(document));
        res.inserted.push(resdoc._id);
      }
      for (const update of changeSet.updates) {
        const collection = db.collection(update.pureName);
        if (update.document) {
          const document = {
            ...update.document,
            ...update.fields,
          };
          const doc = await collection.findOne(convertObjectId(update.condition));
          if (doc) {
            const resdoc = await collection.replaceOne(convertObjectId(update.condition), {
              ...convertObjectId(document),
              _id: doc._id,
            });
            res.replaced.push(resdoc._id);
          }
        } else {
          const set = convertObjectId(_.pickBy(update.fields, (v, k) => !v?.$$undefined$$));
          const unset = _.fromPairs(
            Object.keys(update.fields)
              .filter((k) => update.fields[k]?.$$undefined$$)
              .map((k) => [k, ''])
          );
          const updates = {};
          if (!_.isEmpty(set)) updates.$set = set;
          if (!_.isEmpty(unset)) updates.$unset = unset;

          const resdoc = await collection.updateOne(convertObjectId(update.condition), updates);
          res.updated.push(resdoc._id);
        }
      }
      for (const del of changeSet.deletes) {
        const collection = db.collection(del.pureName);
        const resdoc = await collection.deleteOne(convertObjectId(del.condition));
        res.deleted.push(resdoc._id);
      }
      return res;
    } catch (err) {
      return { errorMessage: err.message };
    }
  },

  async createDatabase(dbhan, name) {
    const db = dbhan.client.db(name);
    await db.createCollection('collection1');
  },

  async dropDatabase(dbhan, name) {
    const db = dbhan.client.db(name);
    await db.dropDatabase();
  },

  async loadFieldValues(dbhan, name, field, search) {
    try {
      const collection = dbhan.getDatabase().collection(name.pureName);
      // console.log('options.condition', JSON.stringify(options.condition, undefined, 2));

      const pipelineMatch = [];

      if (search) {
        const tokens = _.compact(search.split(' ').map((x) => x.trim()));
        if (tokens.length > 0) {
          pipelineMatch.push({
            $match: {
              $and: tokens.map((token) => ({
                [field]: {
                  $regex: `.*${token}.*`,
                  $options: 'i',
                },
              })),
            },
          });
        }
      }

      let cursor = await collection.aggregate([
        ...pipelineMatch,
        {
          $group: { _id: '$' + field },
        },
        {
          $sort: { _id: 1 },
        },
        {
          $limit: 100,
        },
      ]);
      const rows = await cursor.toArray();
      return _.uniqBy(
        rows.map(transformMongoData).map(({ _id }) => {
          if (_.isArray(_id) || _.isPlainObject(_id)) return { value: null };
          return { value: _id };
        }),
        (x) => x.value
      );
    } catch (err) {
      return { errorMessage: err.message };
    }
  },

  readJsonQuery(dbhan, select, structure) {
    const { collection, condition, sort } = select;

    const db = dbhan.getDatabase();
    const res = db
      .collection(collection)
      .find(condition || {})
      .sort(sort || {})
      .stream();

    return res;
  },

  async summaryCommand(dbhan, command, row) {
    switch (command) {
      case 'profileOff':
        await dbhan.client.db(row.name).command({ profile: 0 });
        return;
      case 'profileFiltered':
        await dbhan.client.db(row.name).command({ profile: 1, slowms: 100 });
        return;
      case 'profileAll':
        await dbhan.client.db(row.name).command({ profile: 2 });
        return;
    }
  },

  async serverSummary(dbhan) {
    const res = await dbhan.getDatabase().admin().listDatabases();
    const profiling = await Promise.all(res.databases.map((x) => dbhan.client.db(x.name).command({ profile: -1 })));

    function formatProfiling(info) {
      switch (info.was) {
        case 0:
          return 'No profiling';
        case 1:
          return `Filtered (>${info.slowms} ms)`;
        case 2:
          return 'Profile all';
        default:
          return '???';
      }
    }

    return {
      columns: [
        {
          fieldName: 'name',
          columnType: 'string',
          header: 'Name',
        },
        {
          fieldName: 'sizeOnDisk',
          columnType: 'bytes',
          header: 'Size',
        },
        {
          fieldName: 'profiling',
          columnType: 'string',
          header: 'Profiling',
        },
        {
          fieldName: 'setProfile',
          columnType: 'actions',
          header: 'Profiling actions',
          actions: [
            {
              header: 'Off',
              command: 'profileOff',
            },
            {
              header: 'Filtered',
              command: 'profileFiltered',
            },
            {
              header: 'All',
              command: 'profileAll',
            },
            // {
            //   header: 'View',
            //   openQuery: "db['system.profile'].find()",
            //   tabTitle: 'Profile data',
            // },
            {
              header: 'View',
              openTab: {
                title: 'system.profile',
                icon: 'img collection',
                tabComponent: 'CollectionDataTab',
                props: {
                  pureName: 'system.profile',
                },
              },
              addDbProps: true,
            },
          ],
        },
      ],
      databases: res.databases.map((db, i) => ({
        ...db,
        profiling: formatProfiling(profiling[i]),
      })),
    };
  },

  async close(dbhan) {
    return dbhan.client.close();
  },
};

module.exports = driver;
