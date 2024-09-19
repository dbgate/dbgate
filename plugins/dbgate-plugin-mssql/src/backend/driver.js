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

let requireMsnodesqlv8;
let platformInfo;
let authProxy;

const versionQuery = `
SELECT 
  @@VERSION AS version, 
  SERVERPROPERTY ('productversion') as productVersion,
  CASE 
  WHEN CONVERT(VARCHAR(128), SERVERPROPERTY ('productversion')) like '8%' THEN 'SQL Server 2000'
  WHEN CONVERT(VARCHAR(128), SERVERPROPERTY ('productversion')) like '9%' THEN 'SQL Server 2005'
  WHEN CONVERT(VARCHAR(128), SERVERPROPERTY ('productversion')) like '10.0%' THEN 'SQL Server 2008'
  WHEN CONVERT(VARCHAR(128), SERVERPROPERTY ('productversion')) like '10.5%' THEN 'SQL Server 2008 R2'
  WHEN CONVERT(VARCHAR(128), SERVERPROPERTY ('productversion')) like '11%' THEN 'SQL Server 2012'
  WHEN CONVERT(VARCHAR(128), SERVERPROPERTY ('productversion')) like '12%' THEN 'SQL Server 2014'
  WHEN CONVERT(VARCHAR(128), SERVERPROPERTY ('productversion')) like '13%' THEN 'SQL Server 2016'     
  WHEN CONVERT(VARCHAR(128), SERVERPROPERTY ('productversion')) like '14%' THEN 'SQL Server 2017' 
  WHEN CONVERT(VARCHAR(128), SERVERPROPERTY ('productversion')) like '15%' THEN 'SQL Server 2019' 
  ELSE 'Unknown'
  END AS versionText
`;

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
    title: 'NodeJs portable driver (tedious) - recomended',
    name: 'tedious',
  },
];

/** @type {import('dbgate-types').EngineDriver} */
const driver = {
  ...driverBase,
  analyserClass: MsSqlAnalyser,

  getAuthTypes() {
    const res = [];
    if (requireMsnodesqlv8) res.push(...windowsAuthTypes);

    if (authProxy.isAuthProxySupported()) {
      res.push(
        {
          title: 'NodeJs portable driver (tedious) - recomended',
          name: 'tedious',
        },
        {
          title: 'Microsoft Entra ID (with MFA support)',
          name: 'msentra',
          disabledFields: ['user', 'password'],
        }
      );
    }
    if (res.length > 0) {
      return _.uniqBy(res, 'name');
    }
    return null;
  },

  async connect(conn) {
    const { authType } = conn;
    if (requireMsnodesqlv8 && (authType == 'sspi' || authType == 'sql')) {
      return nativeConnect(conn);
    }

    return tediousConnect(conn);
  },
  async close(pool) {
    return pool.close();
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
    const res = (await this.query(pool, versionQuery)).rows[0];

    if (res.productVersion) {
      const splitted = res.productVersion.split('.');
      const number = parseInt(splitted[0]) || 0;
      res.productVersionNumber = number;
    } else {
      res.productVersionNumber = 0;
    }
    return res;
  },
  async listDatabases(pool) {
    const { rows } = await this.query(pool, 'SELECT name FROM sys.databases order by name');
    return rows;
  },
  getRedirectAuthUrl(connection, options) {
    if (connection.authType != 'msentra') return null;
    return authProxy.authProxyGetRedirectUrl({
      ...options,
      type: 'msentra',
    });
  },
  getAuthTokenFromCode(connection, options) {
    return authProxy.authProxyGetTokenFromCode(options);
  },
  getAccessTokenFromAuth: (connection, req) => {
    return req?.user?.msentraToken;
  },
  async listSchemas(pool) {
    const { rows } = await this.query(pool, 'select schema_id as objectId, name as schemaName from sys.schemas');
    return rows;
  },
};

driver.initialize = dbgateEnv => {
  if (dbgateEnv.nativeModules && dbgateEnv.nativeModules.msnodesqlv8) {
    requireMsnodesqlv8 = dbgateEnv.nativeModules.msnodesqlv8;
  }
  platformInfo = dbgateEnv.platformInfo;
  authProxy = dbgateEnv.authProxy;
  nativeDriver.initialize(dbgateEnv);
};

module.exports = driver;
