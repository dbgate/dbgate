const _ = require('lodash');
const { EventEmitter } = require('events');
const stream = require('stream');
const driverBases = require('../frontend/drivers');
const Analyser = require('./Analyser');
const isPromise = require('is-promise');
const mongodb = require('mongodb');
const { ObjectId } = require('mongodb');
const { EJSON } = require('bson');
const { serializeJsTypesForJsonStringify, deserializeJsTypesFromJsonParse, getLogger } = require('dbgate-tools');
const createBulkInsertStream = require('./createBulkInsertStream');
const {
  convertToMongoCondition,
  convertToMongoAggregate,
  convertToMongoSort,
} = require('../frontend/convertToMongoCondition');

let isProApp;

const logger = getLogger('mongoDriver');

function serializeMongoData(row, driverBase) {
  const { Long } = driverBase.useLegacyDriver ? require('mongodb-old') : mongodb;
  return EJSON.serialize(
    serializeJsTypesForJsonStringify(row, (value) => {
      if (value instanceof Long) {
        if (Number.isSafeInteger(value.toNumber())) {
          return value.toNumber();
        }
        return {
          $bigint: value.toString(),
        };
      }
    })
  );
}

async function readCursor(cursor, options, driverBase) {
  options.recordset({ __isDynamicStructure: true });
  await cursor.forEach((row) => {
    options.row(serializeMongoData(row, driverBase));
  });
}

function deserializeMongoData(value) {
  return deserializeJsTypesFromJsonParse(EJSON.deserialize(value));
}

function findArrayResult(resValue) {
  if (!_.isPlainObject(resValue)) return null;
  const arrays = _.values(resValue).filter((x) => _.isArray(x));
  if (arrays.length == 1) return arrays[0];
  return null;
}

function BinData(_subType, base64) {
  return Buffer.from(base64, 'base64');
}

async function getScriptableDb(dbhan) {
  const db = dbhan.getDatabase();
  db.getCollection = (name) => db.collection(name);
  const collections = await db.listCollections().toArray();
  for (const collection of collections) {
    _.set(db, collection.name, db.collection(collection.name));
  }
  return db;
}

// /**
//  * @param {string} uri
//  * @param {string} dbName
//  * @returns {string}
//  */
// function ensureDatabaseInMongoURI(uri, dbName) {
//   if (!dbName) return uri;

//   try {
//     const url = new URL(uri);

//     const hasDatabase = url.pathname && url.pathname !== '/' && url.pathname.length > 1;
//     if (hasDatabase) return uri;
//     url.pathname = `/${dbName}`;
//     return url.toString();
//   } catch (error) {
//     logger.error('DBGM-00198 Invalid URI format:', error.message);
//     return uri;
//   }
// }

/** @type {import('dbgate-types').EngineDriver<import('mongodb').MongoClient, import('mongodb').Db>} */
const drivers = driverBases.map((driverBase) => ({
  ...driverBase,
  analyserClass: Analyser,
  async connect({ server, port, user, password, database, useDatabaseUrl, databaseUrl, ssl, useSshTunnel }) {
    let mongoUrl;

    if (useDatabaseUrl) {
      if (useSshTunnel) {
        // For SSH tunnel, replace all hosts with tunnel endpoint (localhost:port)
        // MongoDB URL can have multiple hosts: mongodb://user:pass@host1:27017,host2:27017,host3:27017/db
        // We need to replace them with a single localhost:port for the SSH tunnel
        
        // Extract protocol (mongodb:// or mongodb+srv://)
        const protocolMatch = databaseUrl.match(/^mongodb(\+srv)?:\/\//);
        const protocol = protocolMatch ? protocolMatch[0] : 'mongodb://';
        const afterProtocol = databaseUrl.substring(protocol.length);
        
        // Split into auth@hosts/database?options parts
        const atIndex = afterProtocol.indexOf('@');
        let authPart = '';
        let remainder = afterProtocol;
        
        if (atIndex !== -1) {
          authPart = afterProtocol.substring(0, atIndex + 1); // includes @
          remainder = afterProtocol.substring(atIndex + 1);
        }
        
        // Find where hosts end (at / or ? or end of string)
        const slashIndex = remainder.indexOf('/');
        const questionIndex = remainder.indexOf('?');
        let hostsEndIndex = remainder.length;
        
        if (slashIndex !== -1 && questionIndex !== -1) {
          hostsEndIndex = Math.min(slashIndex, questionIndex);
        } else if (slashIndex !== -1) {
          hostsEndIndex = slashIndex;
        } else if (questionIndex !== -1) {
          hostsEndIndex = questionIndex;
        }
        
        const dbAndOptions = remainder.substring(hostsEndIndex);
        
        // Build new URL with tunnel endpoint
        mongoUrl = `${protocol}${authPart}127.0.0.1:${port}${dbAndOptions}`;
        
        // Add directConnection=true if not already present
        if (!mongoUrl.includes('directConnection=')) {
          const separator = mongoUrl.includes('?') ? '&' : (mongoUrl.includes('/') ? '?' : '/?');
          mongoUrl += `${separator}directConnection=true`;
        }
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

    // When using SSH tunnel, force direct connection to prevent replica set discovery
    // which would fail as other replica set members are not accessible through the tunnel
    if (useSshTunnel) {
      options.directConnection = true;
      logger.info('DBGM-00199 MongoDB SSH tunnel mode: enabling directConnection to prevent replica set discovery');
      // Mask password in log - replace anything between :// and @ with ***
      const maskedUrl = mongoUrl.replace(/(mongodb(?:\+srv)?:\/\/)([^@]+)@/, '$1***@');
      logger.info(`DBGM-00200 SSH tunnel connection string: ${maskedUrl}`);
    }

    logger.info(`DBGM-00201 MongoDB connection options: ${JSON.stringify(options)}`);

    const { MongoClient } = driverBase.useLegacyDriver ? require('mongodb-old') : mongodb;

    const client = new MongoClient(mongoUrl, options);
    await client.connect();
    return {
      client,
      database,
      // mongoUrl,
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
    // MongoSH should be used only in stream method
    // if (isProApp) {
    //   const { NodeDriverServiceProvider } = require('@mongosh/service-provider-node-driver');
    //   const { ElectronRuntime } = require('@mongosh/browser-runtime-electron');

    //   const connectionString = ensureDatabaseInMongoURI(dbhan.client.s.url, dbhan.database);
    //   const serviceProvider = await NodeDriverServiceProvider.connect(connectionString);
    //   const runtime = new ElectronRuntime(serviceProvider);
    //   const exprValue = await runtime.evaluate(sql);

    //   const { printable } = exprValue;

    //   if (Array.isArray(printable)) {
    //     return printable;
    //   } else if ('documents' in printable) {
    //     return printable.documents;
    //   } else if ('cursor' in printable && 'firstBatch' in printable.cursor) {
    //     return printable.cursor.firstBatch;
    //   }

    //   return printable;
    // }
    let func;
    func = eval(`(db,ObjectId,BinData) => ${sql}`);
    const db = await getScriptableDb(dbhan);
    const res = func(db, ObjectId.createFromHexString, BinData);
    if (isPromise(res)) await res;
  },
  async operation(dbhan, operation, options) {
    const { type } = operation;
    switch (type) {
      case 'createCollection':
        await this.script(dbhan, `db.createCollection('${operation.collection.name}')`);
        break;
      // case 'dropCollection':
      //   await this.script(dbhan, `db.getCollection('${operation.collection}').drop()`);
      //   break;
      // case 'renameCollection':
      //   await this.script(
      //     dbhan,
      //     `db.getCollection('${operation.collection}').renameCollection('${operation.newName}')`
      //   );
      //   break;
      // case 'cloneCollection':
      //   await this.script(
      //     dbhan,
      //     `db.getCollection('${operation.collection}').aggregate([{$out: '${operation.newName}'}]).toArray()`
      //   );
      //   break;

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
    if (isProApp()) {
      const { NodeDriverServiceProvider } = require('@mongosh/service-provider-node-driver');
      const { ElectronRuntime } = require('@mongosh/browser-runtime-electron');

      let exprValue;

      try {
        const serviceProvider = new NodeDriverServiceProvider(dbhan.client, new EventEmitter(), {
          productDocsLink: '',
          productName: 'DbGate',
        });
        const runtime = new ElectronRuntime(serviceProvider);
        await runtime.evaluate(`use ${dbhan.database}`);
        exprValue = await runtime.evaluate(sql);
      } catch (err) {
        options.info({
          message: 'Error evaluating expression: ' + err.message,
          time: new Date(),
          severity: 'error',
        });
        options.done();
        return;
      }

      const { printable, type } = exprValue;

      if (typeof printable === 'string') {
        options.info({
          time: new Date(),
          severity: 'info',
          message: printable,
        });
        options.done();
        return;
      } else if (typeof printable !== 'object' || printable === null) {
        options.info({
          printable: printable,
          time: new Date(),
          severity: 'info',
          message: 'Query returned not supported value.',
        });
        options.done();
        return;
      }

      if (type === 'Document') {
        options.recordset({ __isDynamicStructure: true });
        options.row(printable);
      } else if (type === 'Cursor' || exprValue.type === 'AggregationCursor') {
        options.recordset({ __isDynamicStructure: true });
        for (const doc of printable.documents) {
          options.row(doc);
        }
      } else {
        if (Array.isArray(printable)) {
          options.recordset({ __isDynamicStructure: true });
          for (const row of printable) {
            options.row(row);
          }
        } else if ('documents' in printable) {
          options.recordset({ __isDynamicStructure: true });
          for (const row of printable.documents) {
            options.row(row);
          }
        } else if ('cursor' in printable && 'firstBatch' in printable.cursor) {
          options.recordset({ __isDynamicStructure: true });
          for (const row of printable.cursor.firstBatch) {
            options.row(row);
          }
        } else {
          options.info({
            printable: printable,
            time: new Date(),
            severity: 'info',
            message: 'Query returned not supported value.',
          });
        }
      }

      options.done();
    } else {
      let func;
      try {
        func = eval(`(db,ObjectId,BinData) => ${sql}`);
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
        exprValue = func(db, ObjectId.createFromHexString, BinData);
      } catch (err) {
        options.info({
          message: 'Error evaluating expression: ' + err.message,
          time: new Date(),
          severity: 'error',
        });
        options.done();
        return;
      }

      const { AbstractCursor } = driverBase.useLegacyDriver ? require('mongodb-old') : mongodb;

      if (exprValue instanceof AbstractCursor) {
        await readCursor(exprValue, options, driverBase);
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
    }
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

    func = eval(`(db,ObjectId,BinData) => ${sql}`);
    const db = await getScriptableDb(dbhan);
    exprValue = func(db, ObjectId.createFromHexString, BinData);

    const pass = new stream.PassThrough({
      objectMode: true,
      highWaterMark: 100,
    });

    const cursorStream = exprValue.stream();

    cursorStream.on('data', (row) => {
      pass.write(serializeMongoData(row, driverBase));
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
        const count = await collection.countDocuments(deserializeMongoData(mongoCondition) || {});
        return { count };
      } else if (options.aggregate) {
        let cursor = await collection.aggregate(deserializeMongoData(convertToMongoAggregate(options.aggregate)));
        const rows = await cursor.toArray();
        return {
          rows: rows
            .map((row) => serializeMongoData(row, driverBase))
            .map((x) => ({
              ...x._id,
              ..._.omit(x, ['_id']),
            })),
        };
      } else {
        // console.log('options.condition', JSON.stringify(options.condition, undefined, 2));
        let cursor = await collection.find(deserializeMongoData(mongoCondition) || {});
        if (options.sort) cursor = cursor.sort(convertToMongoSort(options.sort));
        if (options.skip) cursor = cursor.skip(options.skip);
        if (options.limit) cursor = cursor.limit(options.limit);
        const rows = await cursor.toArray();
        return {
          rows: rows.map((row) => serializeMongoData(row, driverBase)),
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
        const resdoc = await collection.insertOne(deserializeMongoData(document));
        res.inserted.push(resdoc._id);
      }
      for (const update of changeSet.updates) {
        const collection = db.collection(update.pureName);
        if (update.document) {
          const document = {
            ...update.document,
            ...update.fields,
          };
          const doc = await collection.findOne(deserializeMongoData(update.condition));
          if (doc) {
            const resdoc = await collection.replaceOne(deserializeMongoData(update.condition), {
              ...deserializeMongoData(document),
              _id: doc._id,
            });
            res.replaced.push(resdoc._id);
          }
        } else {
          const set = deserializeMongoData(_.pickBy(update.fields, (v, k) => !v?.$$undefined$$));
          const unset = _.fromPairs(
            Object.keys(update.fields)
              .filter((k) => update.fields[k]?.$$undefined$$)
              .map((k) => [k, ''])
          );
          const updates = {};
          if (!_.isEmpty(set)) updates.$set = set;
          if (!_.isEmpty(unset)) updates.$unset = unset;

          const resdoc = await collection.updateOne(deserializeMongoData(update.condition), updates);
          res.updated.push(resdoc._id);
        }
      }
      for (const del of changeSet.deletes) {
        const collection = db.collection(del.pureName);
        const resdoc = await collection.deleteOne(deserializeMongoData(del.condition));
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
        rows
          .map((row) => serializeMongoData(row, driverBase))
          .map(({ _id }) => {
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
    const [processes, variables, databases] = await Promise.all([
      this.listProcesses(dbhan),
      this.listVariables(dbhan),
      this.listDatabases(dbhan),
    ]);

    /** @type {import('dbgate-types').ServerSummary} */
    const data = {
      processes,
      variables,
      databases: {
        rows: databases,
        columns: [
          {
            filterable: true,
            sortable: true,
            header: 'Name',
            fieldName: 'name',
            type: 'data',
          },
          {
            sortable: true,
            header: 'Size on disk',
            fieldName: 'sizeOnDisk',
            type: 'fileSize',
          },
          {
            filterable: true,
            sortable: true,
            header: 'Empty',
            fieldName: 'empty',
            type: 'data',
          },
        ],
      },
    };

    return data;
  },

  async close(dbhan) {
    return dbhan.client.close();
  },

  async listProcesses(dbhan) {
    const db = dbhan.getDatabase();
    const adminDb = db.admin();

    const currentOp = await adminDb.command({
      currentOp: {
        $all: true,
        active: true,
        idle: true,
        system: true,
        killPending: true,
      },
    });

    const processes = currentOp.inprog.map((op) => ({
      processId: op.opid,
      connectionId: op.connectionId,
      client: op.client,
      operation: op.op,
      namespace: op.ns,
      command: op.command,
      runningTime: op.secs_running,
      state: op.state,
      waitingFor: op.waitingForLock,
      locks: op.locks,
      progress: op.progress,
    }));

    return processes;
  },

  async listVariables(dbhan) {
    const db = dbhan.getDatabase();
    const adminDb = db.admin();

    const variables = await adminDb
      .command({ getParameter: '*' })
      .then((params) =>
        Object.entries(params).map(([key, value]) => ({ variable: key, value: value?.value || value }))
      );

    return variables;
  },

  async killProcess(dbhan, processId) {
    const db = dbhan.getDatabase();
    const adminDb = db.admin();

    const result = await adminDb.command({
      killOp: 1,
      op: processId,
    });

    logger.info(`Killed process with ID ${processId}`, result);

    return result;
  },
}));

drivers.initialize = (dbgateEnv) => {
  isProApp = dbgateEnv.isProApp;
};

module.exports = drivers;
