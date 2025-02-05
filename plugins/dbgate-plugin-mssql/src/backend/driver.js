const _ = require('lodash');
const stream = require('stream');
const driverBase = require('../frontend/driver');
const MsSqlAnalyser = require('./MsSqlAnalyser');
const createTediousBulkInsertStream = require('./createTediousBulkInsertStream');
const createNativeBulkInsertStream = require('./createNativeBulkInsertStream');
const AsyncLock = require('async-lock');
const lock = new AsyncLock();
const { tediousConnect, tediousQueryCore, tediousReadQuery, tediousStream } = require('./tediousDriver');
const { nativeConnect, nativeQueryCore, nativeReadQuery, nativeStream } = require('./nativeDriver');
const { getLogger } = global.DBGATE_PACKAGES['dbgate-tools'];

const logger = getLogger('mssqlDriver');

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
    if (platformInfo?.isWindows) res.push(...windowsAuthTypes);

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
    if (!platformInfo.isElectron) {
      res.push({
        title: 'Azure Managed Identity',
        name: 'azureManagedIdentity',
        disabledFields: ['user', 'password'],
      });
    }

    if (res.length > 0) {
      return _.uniqBy(res, 'name');
    }
    return null;
  },

  async connect(conn) {
    const { authType } = conn;
    const connectionType =
      platformInfo?.isWindows && (authType == 'sspi' || authType == 'sql') ? 'msnodesqlv8' : 'tedious';
    const client = connectionType == 'msnodesqlv8' ? await nativeConnect(conn) : await tediousConnect(conn);

    return {
      client,
      connectionType,
      database: conn.database,
    };
  },
  async close(dbhan) {
    return dbhan.client.close();
  },
  async queryCore(dbhan, sql, options) {
    if (dbhan.connectionType == 'msnodesqlv8') {
      return nativeQueryCore(dbhan, sql, options);
    } else {
      return tediousQueryCore(dbhan, sql, options);
    }
  },
  async query(dbhan, sql, options) {
    return lock.acquire('connection', async () => {
      return this.queryCore(dbhan, sql, options);
    });
  },
  async stream(dbhan, sql, options) {
    if (dbhan.connectionType == 'msnodesqlv8') {
      return nativeStream(dbhan, sql, options);
    } else {
      return tediousStream(dbhan, sql, options);
    }
  },
  async readQuery(dbhan, sql, structure) {
    if (dbhan.connectionType == 'msnodesqlv8') {
      return nativeReadQuery(dbhan, sql, structure);
    } else {
      return tediousReadQuery(dbhan, sql, structure);
    }
  },
  async writeTable(dbhan, name, options) {
    if (dbhan.connectionType == 'msnodesqlv8') {
      return createNativeBulkInsertStream(this, stream, dbhan, name, options);
    } else {
      return createTediousBulkInsertStream(this, stream, dbhan, name, options);
    }
  },
  async getVersion(dbhan) {
    const res = (await this.query(dbhan, versionQuery)).rows[0];

    if (res.productVersion) {
      const splitted = res.productVersion.split('.');
      const number = parseInt(splitted[0]) || 0;
      res.productVersionNumber = number;
    } else {
      res.productVersionNumber = 0;
    }
    return res;
  },
  async listDatabases(dbhan) {
    const { rows } = await this.query(dbhan, 'SELECT name FROM sys.databases order by name');
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
  async listSchemas(dbhan) {
    const { rows } = await this.query(dbhan, 'select schema_id as objectId, name as schemaName from sys.schemas');

    const defaultSchemaRows = await this.query(dbhan, 'SELECT SCHEMA_NAME() as name');
    const defaultSchema = defaultSchemaRows.rows[0]?.name;

    logger.debug(`Loaded ${rows.length} mssql schemas`);

    return rows.map(x => ({
      ...x,
      isDefault: x.schemaName == defaultSchema,
    }));
  },
};

driver.initialize = dbgateEnv => {
  platformInfo = dbgateEnv.platformInfo;
  authProxy = dbgateEnv.authProxy;
};

module.exports = driver;
