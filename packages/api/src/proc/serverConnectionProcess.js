const stableStringify = require('json-stable-stringify');
const {
  extractBoolSettingsValue,
  extractIntSettingsValue,
  getLogger,
  extractErrorLogData,
  extractErrorMessage,
  serializeJsTypesForJsonStringify,
} = require('dbgate-tools');
const childProcessChecker = require('../utility/childProcessChecker');
const requireEngineDriver = require('../utility/requireEngineDriver');
const { connectUtility } = require('../utility/connectUtility');
const { handleProcessCommunication } = require('../utility/processComm');
const {
  ensureServerChatQueryAllowed,
  limitServerChatQueryResult,
  resolveServerChatDatabaseName,
} = require('../utility/serverChatQuery');
const logger = getLogger('srvconnProcess');

let dbhan;
let storedConnection;
let lastDatabases = null;
let lastStatus = null;
let lastPing = null;
let afterConnectCallbacks = [];
let serverVersion = null;
let serverVersionPromise = null;

const MSSQL_ENGINE = 'mssql@dbgate-plugin-mssql';
const POSTGRES_ENGINE = 'postgres@dbgate-plugin-postgres';
const MYSQL_ENGINE = 'mysql@dbgate-plugin-mysql';
const MARIADB_ENGINE = 'mariadb@dbgate-plugin-mysql';
const SERVER_CHAT_SUPPORTED_ENGINES = new Set([MSSQL_ENGINE, POSTGRES_ENGINE, MYSQL_ENGINE, MARIADB_ENGINE]);
const SUPPORTED_MSSQL_ENGINE_EDITIONS = new Set([2, 3, 4, 8]);
const SERVER_CHAT_DATABASE_LIMIT = 100;
const CHAT_DATABASES_QUERY = `
SELECT name
FROM sys.databases
WHERE state_desc = 'ONLINE'
  AND HAS_DBACCESS(name) = 1
ORDER BY name
`;

async function handleRefresh() {
  const driver = requireEngineDriver(storedConnection);
  try {
    let databases = await driver.listDatabases(dbhan);
    if (storedConnection?.allowedDatabases?.trim()) {
      const allowedDatabaseList = storedConnection.allowedDatabases
        .split('\n')
        .map(x => x.trim().toLowerCase())
        .filter(x => x);
      databases = databases.filter(x => allowedDatabaseList.includes(x.name.toLocaleLowerCase()));
    }
    if (storedConnection?.allowedDatabasesRegex?.trim()) {
      const regex = new RegExp(storedConnection.allowedDatabasesRegex, 'i');
      databases = databases.filter(x => regex.test(x.name));
    }
    setStatusName('ok');
    const databasesString = stableStringify(databases);
    if (lastDatabases != databasesString) {
      process.send({ msgtype: 'databases', databases });
      lastDatabases = databasesString;
    }
  } catch (err) {
    setStatus({
      name: 'error',
      message: err.message,
    });
    logger.error(extractErrorLogData(err), 'DBGM-00152 Error refreshing server databases');
    setTimeout(() => process.exit(1), 1000);
  }
}

async function readVersion() {
  const driver = requireEngineDriver(storedConnection);
  try {
    serverVersion = await driver.getVersion(dbhan);
  } catch (err) {
    logger.error(extractErrorLogData(err), 'DBGM-00153 Error getting DB server version');
    serverVersion = { version: 'Unknown' };
  }
  process.send({ msgtype: 'version', version: serverVersion });
}

function setStatus(status) {
  const statusString = stableStringify(status);
  if (lastStatus != statusString) {
    process.send({ msgtype: 'status', status });
    lastStatus = statusString;
  }
}

function setStatusName(name) {
  setStatus({ name });
}

async function handleConnect(connection) {
  storedConnection = connection;
  const { globalSettings } = storedConnection;
  setStatusName('pending');
  lastPing = new Date().getTime();

  const driver = requireEngineDriver(storedConnection);
  try {
    dbhan = await connectUtility(driver, storedConnection, 'app');
    serverVersionPromise = readVersion();
    handleRefresh();
    if (extractBoolSettingsValue(globalSettings, 'connection.autoRefresh', false)) {
      setInterval(
        handleRefresh,
        extractIntSettingsValue(globalSettings, 'connection.autoRefreshInterval', 30, 5, 3600) * 1000
      );
    }
  } catch (err) {
    setStatus({
      name: 'error',
      message: err.message,
    });
    logger.error(extractErrorLogData(err), 'DBGM-00154 Error connecting to server');
    setTimeout(() => process.exit(1), 1000);
  }

  for (const [resolve] of afterConnectCallbacks) {
    resolve();
  }
  afterConnectCallbacks = [];
}

function waitConnected() {
  if (dbhan) return Promise.resolve();
  return new Promise((resolve, reject) => {
    afterConnectCallbacks.push([resolve, reject]);
  });
}

function handlePing() {
  lastPing = new Date().getTime();
}

function ensureServerSqlChatSupported() {
  if (!SERVER_CHAT_SUPPORTED_ENGINES.has(storedConnection?.engine)) {
    throw new Error(
      'DBGM-00000 Server SQL chat is only available for Microsoft SQL Server, PostgreSQL, MySQL and MariaDB connections'
    );
  }

  if (storedConnection.engine === MSSQL_ENGINE) {
    const engineEdition = Number(serverVersion?.engineEdition);
    if (!SUPPORTED_MSSQL_ENGINE_EDITIONS.has(engineEdition)) {
      throw new Error(
        `DBGM-00000 SQL Server EngineEdition ${
          Number.isFinite(engineEdition) ? engineEdition : 'unknown'
        } does not support server SQL chat`
      );
    }
  }
}

async function waitServerChatReady() {
  await waitConnected();
  if (serverVersionPromise) {
    await serverVersionPromise;
  }
  ensureServerSqlChatSupported();
}

async function handleServerChatReady({ msgid }) {
  try {
    await waitServerChatReady();
    process.send({
      msgtype: 'response',
      msgid,
      result: { engineEdition: Number(serverVersion.engineEdition) },
    });
  } catch (err) {
    process.send({
      msgtype: 'response',
      msgid,
      errorMessage: extractErrorMessage(err, 'DBGM-00000 Server SQL chat is not ready'),
    });
  }
}

async function loadChatDatabaseNames() {
  const driver = requireEngineDriver(storedConnection);

  if (storedConnection.engine === MSSQL_ENGINE) {
    const { rows } = await driver.query(dbhan, CHAT_DATABASES_QUERY);
    return rows
      .map(row => row?.name)
      .filter(name => typeof name == 'string')
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }

  const databases = await driver.listDatabases(dbhan);
  return databases
    .map(database => database?.name)
    .filter(name => typeof name == 'string')
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

async function handleChatDatabases({ msgid, filter }) {
  try {
    await waitServerChatReady();
    const normalizedFilter = typeof filter == 'string' ? filter.trim().toLowerCase() : '';
    const matchingDatabases = (await loadChatDatabaseNames()).filter(name =>
      name.toLowerCase().includes(normalizedFilter)
    );
    const databases = matchingDatabases.slice(0, SERVER_CHAT_DATABASE_LIMIT);

    process.send({
      msgtype: 'response',
      msgid,
      result: {
        databases,
        returnedCount: databases.length,
        totalMatches: matchingDatabases.length,
        truncated: matchingDatabases.length > databases.length,
      },
    });
  } catch (err) {
    process.send({
      msgtype: 'response',
      msgid,
      errorMessage: extractErrorMessage(err, 'DBGM-00000 Error loading databases for server SQL chat'),
    });
  }
}

async function handleCanonicalizeChatDatabase({ msgid, database }) {
  try {
    await waitServerChatReady();
    const requestedDatabase = typeof database == 'string' ? database.trim() : '';
    const canonicalDatabase = resolveServerChatDatabaseName(await loadChatDatabaseNames(), requestedDatabase);
    process.send({
      msgtype: 'response',
      msgid,
      result: { database: canonicalDatabase ?? null },
    });
  } catch (err) {
    process.send({
      msgtype: 'response',
      msgid,
      errorMessage: extractErrorMessage(err, 'DBGM-00000 Error resolving database for server SQL chat'),
    });
  }
}

async function handleQueryData({ msgid, sql }) {
  try {
    await waitServerChatReady();
    const driver = requireEngineDriver(storedConnection);
    ensureServerChatQueryAllowed(storedConnection, driver);
    const result = await driver.query(dbhan, sql);
    const limitedResult = limitServerChatQueryResult(result);

    process.send({ msgtype: 'response', msgid, ...serializeJsTypesForJsonStringify(limitedResult) });
  } catch (err) {
    process.send({
      msgtype: 'response',
      msgid,
      errorMessage: extractErrorMessage(err, 'DBGM-00000 Error executing server SQL'),
    });
  }
}

async function handleDatabaseOp(op, { msgid, name }) {
  try {
    const driver = requireEngineDriver(storedConnection);
    dbhan = await connectUtility(driver, storedConnection, 'app');
    if (driver[op]) {
      await driver[op](dbhan, name);
    } else {
      const dmp = driver.createDumper();
      dmp[op](name);
      logger.info({ sql: dmp.s }, 'DBGM-00043 Running script');
      await driver.query(dbhan, dmp.s, { discardResult: true });
    }
    await handleRefresh();

    process.send({ msgtype: 'response', msgid, status: 'ok' });
  } catch (err) {
    process.send({ msgtype: 'response', msgid, errorMessage: err.message });
  }
}

async function handleDriverDataCore(msgid, callMethod) {
  await waitConnected();
  const driver = requireEngineDriver(storedConnection);
  try {
    const result = await callMethod(driver);
    process.send({ msgtype: 'response', msgid, result });
  } catch (err) {
    process.send({ msgtype: 'response', msgid, errorMessage: err.message });
  }
}

async function handleServerSummary({ msgid }) {
  return handleDriverDataCore(msgid, driver => driver.serverSummary(dbhan));
}

async function handleKillDatabaseProcess({ msgid, pid }) {
  await waitConnected();
  const driver = requireEngineDriver(storedConnection);

  try {
    const result = await driver.killProcess(dbhan, Number(pid));
    process.send({ msgtype: 'response', msgid, result });
  } catch (err) {
    process.send({ msgtype: 'response', msgid, errorMessage: err.message });
  }
}

async function handleListDatabaseProcesses({ msgid }) {
  await waitConnected();
  const driver = requireEngineDriver(storedConnection);

  try {
    const result = await driver.listProcesses(dbhan);
    process.send({ msgtype: 'response', msgid, result });
  } catch (err) {
    process.send({ msgtype: 'response', msgid, errorMessage: err.message });
  }
}

async function handleSummaryCommand({ msgid, command, row }) {
  return handleDriverDataCore(msgid, driver => driver.summaryCommand(dbhan, command, row));
}

const messageHandlers = {
  connect: handleConnect,
  ping: handlePing,
  serverSummary: handleServerSummary,
  killDatabaseProcess: handleKillDatabaseProcess,
  listDatabaseProcesses: handleListDatabaseProcesses,
  summaryCommand: handleSummaryCommand,
  serverChatReady: handleServerChatReady,
  chatDatabases: handleChatDatabases,
  canonicalizeChatDatabase: handleCanonicalizeChatDatabase,
  queryData: handleQueryData,
  createDatabase: props => handleDatabaseOp('createDatabase', props),
  dropDatabase: props => handleDatabaseOp('dropDatabase', props),
};

async function handleMessage({ msgtype, ...other }) {
  const handler = messageHandlers[msgtype];
  await handler(other);
}

function start() {
  childProcessChecker();

  setInterval(async () => {
    const time = new Date().getTime();
    if (time - lastPing > 40 * 1000) {
      logger.info('DBGM-00044 Server connection not alive, exiting');
      const driver = requireEngineDriver(storedConnection);
      if (dbhan) {
        await driver.close(dbhan);
      }
      process.exit(0);
    }
  }, 10 * 1000);

  process.on('message', async message => {
    if (handleProcessCommunication(message)) return;
    try {
      await handleMessage(message);
    } catch (err) {
      setStatus({
        name: 'error',
        message: err.message,
      });
      logger.error(extractErrorLogData(err), `DBGM-00155 Error processing message ${message?.['msgtype']}`);
    }
  });
}

module.exports = { start };
