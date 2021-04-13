const _ = require('lodash');
const stream = require('stream');
const driverBase = require('../frontend/driver');
const MsSqlAnalyser = require('./MsSqlAnalyser');
const createTediousBulkInsertStream = require('./createTediousBulkInsertStream');
const createNativeBulkInsertStream = require('./createNativeBulkInsertStream');
const AsyncLock = require('async-lock');
const nativeDriver = require('./nativeDriver');
const lock = new AsyncLock();
const { tediousConnect, tediousQueryCore, tediousReadQuery, tediousStream } = require('./tediousDriver');
const { nativeConnect, nativeQueryCore, nativeReadQuery, nativeStream } = nativeDriver;
let msnodesqlv8;

const windowsAuthTypes = [
  {
    title: 'Windows',
    name: 'sspi',
    disabledFields: ['password', 'port', 'user'],
  },
  {
    title: 'SQL Server',
    name: 'sql',
    disabledFields: ['port'],
  },
  {
    title: 'Tedious driver',
    name: 'tedious',
  },
];

/** @type {import('dbgate-types').EngineDriver} */
const driver = {
  ...driverBase,
  analyserClass: MsSqlAnalyser,

  getAuthTypes() {
    return msnodesqlv8 ? windowsAuthTypes : null;
  },

  async connect(conn) {
    const { authType } = conn;
    if (msnodesqlv8 && (authType == 'sspi' || authType == 'sql')) {
      return nativeConnect(conn);
    }

    return tediousConnect(conn);
  },
  async queryCore(pool, sql, options) {
    if (pool._connectionType == 'msnodesqlv8') {
      return nativeQueryCore(pool, sql, options);
    } else {
      return tediousQueryCore(pool, sql, options);
    }
  },
  async query(pool, sql, options) {
    return lock.acquire('connection', async () => {
      return this.queryCore(pool, sql, options);
    });
  },
  async stream(pool, sql, options) {
    if (pool._connectionType == 'msnodesqlv8') {
      return nativeStream(pool, sql, options);
    } else {
      return tediousStream(pool, sql, options);
    }
  },
  async readQuery(pool, sql, structure) {
    if (pool._connectionType == 'msnodesqlv8') {
      return nativeReadQuery(pool, sql, structure);
    } else {
      return tediousReadQuery(pool, sql, structure);
    }
  },
  async writeTable(pool, name, options) {
    if (pool._connectionType == 'msnodesqlv8') {
      return createNativeBulkInsertStream(this, stream, pool, name, options);
    } else {
      return createTediousBulkInsertStream(this, stream, pool, name, options);
    }
  },
  async getVersion(pool) {
    const { version } = (await this.query(pool, 'SELECT @@VERSION AS version')).rows[0];
    return { version };
  },
  async listDatabases(pool) {
    const { rows } = await this.query(pool, 'SELECT name FROM sys.databases order by name');
    return rows;
  },
};

driver.initialize = dbgateEnv => {
  if (dbgateEnv.nativeModules && dbgateEnv.nativeModules.msnodesqlv8) {
    msnodesqlv8 = dbgateEnv.nativeModules.msnodesqlv8();
  }
  nativeDriver.initialize(dbgateEnv);
};

module.exports = driver;
