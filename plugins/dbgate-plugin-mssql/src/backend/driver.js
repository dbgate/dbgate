const _ = require('lodash');
const fs = require('fs');
const stream = require('stream');
const { finished } = require('stream/promises');
const driverBase = require('../frontend/driver');
const MsSqlAnalyser = require('./MsSqlAnalyser');
const createTediousBulkInsertStream = require('./createTediousBulkInsertStream');
const createNativeBulkInsertStream = require('./createNativeBulkInsertStream');
const AsyncLock = require('async-lock');
const lock = new AsyncLock();
const { tediousConnect, tediousQueryCore, tediousReadQuery, tediousStream } = require('./tediousDriver');
const { nativeConnect, nativeQueryCore, nativeReadQuery, nativeStream } = require('./nativeDriver');
const { dumpMssql, restoreSqlDump } = require('dbgate-mssql-dumper');
const { fromTediousConnection } = require('dbgate-mssql-dumper/tedious');
const { fromNativeConnection } = require('./nativeDumperAdapter');
const { getLogger } = global.DBGATE_PACKAGES['dbgate-tools'];
const sql = require('./sql');

const logger = getLogger('mssqlDriver');

let platformInfo;
let authProxy;

function findDbInfoTable(dbinfo, schemaName, pureName) {
  if (!dbinfo?.tables) return null;
  if (schemaName) {
    return dbinfo.tables.find(table => table.schemaName == schemaName && table.pureName == pureName);
  }
  const tables = dbinfo.tables.filter(table => table.pureName == pureName);
  return tables.length == 1 ? tables[0] : null;
}

function isPrimaryKeyColumn(dbinfo, schemaName, tableName, columnName) {
  const table = findDbInfoTable(dbinfo, schemaName, tableName);
  return !!table?.primaryKey?.columns?.some(column => column.columnName == columnName);
}

async function enrichColumnMetadata(columns, dbinfo) {
  return columns.map(column => ({
    ...column,
    isPrimaryKey:
      column.isPrimaryKey ||
      isPrimaryKeyColumn(dbinfo, column.tableSchema, column.tableName, column.sourceColumnName),
  }));
}

const versionQuery = `
SELECT 
  @@VERSION AS version, 
  SERVERPROPERTY ('productversion') as productVersion,
  CONVERT(INT, SERVERPROPERTY ('EngineEdition')) as engineEdition,
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

function createMssqlDumperConnection(dbhan) {
  if (dbhan.connectionType == 'tedious') return fromTediousConnection(dbhan.client);
  if (dbhan.connectionType == 'msnodesqlv8') return fromNativeConnection(dbhan.client);
  throw new Error('DBGM-00000 Unsupported SQL Server connection type for dbgate-mssql-dumper');
}

function createProgressReporter(runner, prefix) {
  let lastPhase = null;
  let lastReport = 0;

  return progress => {
    const now = Date.now();
    if (progress.phase == lastPhase && now - lastReport < 1000) return;

    lastPhase = progress.phase;
    lastReport = now;
    const details = [];
    if (progress.message) details.push(progress.message);
    if (progress.batchIndex != null) details.push(`batch ${progress.batchIndex}`);
    if (progress.objectsProcessed != null) details.push(`${progress.objectsProcessed} processed`);
    if (progress.rowsRestored != null) details.push(`${progress.rowsRestored} rows`);
    if (progress.bytesWritten != null) details.push(`${progress.bytesWritten} bytes`);
    runner.info({
      message: `${prefix}: ${progress.phase}${details.length > 0 ? ` (${details.join(', ')})` : ''}`,
      severity: 'info',
    });
  };
}

/** @type {import('dbgate-types').EngineDriver} */
const driver = {
  ...driverBase,
  analyserClass: MsSqlAnalyser,

  async backupDatabase(connection, settings, runner) {
    if (!driverBase.supportsNodejsBackup) {
      throw new Error('DBGM-00000 dbgate-mssql-dumper is available only for Microsoft SQL Server connections');
    }
    const { outputFile, database, selectedTables = [], skippedTables = [], options = {} } = settings;
    if (options.dataOnly && options.schemaOnly) {
      throw new Error('DBGM-00000 Data-only and schema-only backup options cannot be enabled together');
    }

    const dbhan = await this.connect({
      ...connection,
      database,
      ...(connection.authType == 'sql' ? { authType: 'tedious' } : {}),
    });
    const output = fs.createWriteStream(outputFile);

    try {
      const result = await dumpMssql(
        createMssqlDumperConnection(dbhan),
        {
          mode: options.dataOnly ? 'data-only' : options.schemaOnly ? 'schema-only' : 'full',
          render: { includeDropStatements: !!options.includeDropStatements },
          ...(skippedTables.length > 0
            ? {
                selection: {
                  tables: selectedTables,
                  excludeTables: skippedTables,
                },
              }
            : {}),
        },
        output,
        createProgressReporter(runner, 'SQL Server dump'),
        runner.signal
      );

      if (result.cancelled) {
        throw new Error('DBGM-00000 SQL Server backup cancelled');
      }

      output.end();
      await finished(output);

      for (const warning of result.warnings) {
        runner.info({
          message: warning.message,
          severity: warning.severity == 'warning' ? 'warning' : 'info',
        });
      }
      runner.info({
        message: `Wrote ${result.renderedDumpIds.length} objects, ${result.rowsExported} rows and ${result.bytesWritten} bytes`,
        severity: 'info',
      });
    } catch (error) {
      output.destroy();
      throw error;
    } finally {
      await this.close(dbhan);
    }
  },

  async restoreDatabase(connection, settings, runner) {
    if (!driverBase.supportsNodejsRestore) {
      throw new Error('DBGM-00000 dbgate-mssql-dumper is available only for Microsoft SQL Server connections');
    }
    const { inputFile, database } = settings;
    const dbhan = await this.connect({
      ...connection,
      database,
      ...(connection.authType == 'sql' ? { authType: 'tedious' } : {}),
    });
    const input = fs.createReadStream(inputFile, { highWaterMark: 64 * 1024 });

    try {
      const result = await restoreSqlDump({
        source: input,
        connection: createMssqlDumperConnection(dbhan),
        signal: runner.signal,
        progress: createProgressReporter(runner, 'SQL Server restore'),
      });
      if (result.cancelled) {
        throw new Error('DBGM-00000 SQL Server restore cancelled');
      }
      if (result.errors.length > 0) {
        const error = result.errors[0];
        throw new Error(
          `DBGM-00000 SQL Server restore failed in batch ${error.batchIndex}, lines ${error.location.startLine}-${error.location.endLine}: ${error.message} SQL: ${error.sqlPreview}`
        );
      }
      runner.info({
        message: `Restored ${result.batchesExecuted} batches and ${result.rowsRestored} rows`,
        severity: 'info',
      });
    } finally {
      input.destroy();
      await this.close(dbhan);
    }
  },

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

    const dbhan = {
      client,
      connectionType,
      database: conn.database,
      conid: conn.conid,
    };
    if (conn.defaultIsolationLevel) {
      await this.setTransactionIsolationLevel(dbhan, conn.defaultIsolationLevel);
    }
    return dbhan;
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
  enrichColumnMetadata(dbhan, sql, columns, dbinfo) {
    return enrichColumnMetadata(columns, dbinfo);
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

    res.engineEdition = parseInt(res.engineEdition, 10) || 0;

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

  async listDatabasesFull(dbhan) {
    const { rows } = await this.query(dbhan, sql.listDatabases);
    return rows;
  },

  async listProcesses(dbhan) {
    const { rows } = await this.query(dbhan, sql.listProcesses);
    return rows;
  },

  async listVariables(dbhan) {
    const { rows } = await this.query(dbhan, sql.listVariables);
    return rows;
  },

  async killProcess(dbhan, processId) {
    await this.query(dbhan, `KILL ${processId}`);
  },

  async setTransactionIsolationLevel(dbhan, level) {
    if (this.isolationLevels && level && !this.isolationLevels.includes(level)) {
      throw new Error(`Isolation level "${level}" is not supported. Supported levels: ${this.isolationLevels.join(', ')}`);
    }
    await this.query(dbhan, `SET TRANSACTION ISOLATION LEVEL ${level}`);
  },

  async serverSummary(dbhan) {
    const [variables, processes, databases] = await Promise.all([
      this.listVariables(dbhan),
      this.listProcesses(dbhan),
      this.listDatabasesFull(dbhan),
    ]);

    return {
      variables: variables,
      processes: processes,
      databases: {
        rows: databases,
        columns: [
          {
            filterable: true,
            sortable: true,
            header: 'Database',
            fieldName: 'name',
            type: 'data',
          },
          {
            filterable: true,
            sortable: true,
            header: 'Status',
            fieldName: 'status',
            type: 'data',
          },
          {
            filterable: true,
            sortable: true,
            header: 'Recovery Model',
            fieldName: 'recoveryModel',
            type: 'data',
          },
          {
            filterable: true,
            sortable: true,
            header: 'Compatibility Level',
            fieldName: 'compatibilityLevel',
            type: 'data',
          },
          {
            filterable: true,
            sortable: true,
            header: 'Read Only',
            fieldName: 'isReadOnly',
            type: 'data',
          },
          {
            sortable: true,
            header: 'Data Size',
            fieldName: 'sizeOnDisk',
            type: 'fileSize',
          },
          {
            sortable: true,
            header: 'Log Size',
            fieldName: 'logSizeOnDisk',
            type: 'fileSize',
          },
        ],
      },
    };
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

    logger.debug(`DBGM-00140 Loaded ${rows.length} mssql schemas`);

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
