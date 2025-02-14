const stableStringify = require('json-stable-stringify');
const { splitQuery } = require('dbgate-query-splitter');
const childProcessChecker = require('../utility/childProcessChecker');
const {
  extractBoolSettingsValue,
  extractIntSettingsValue,
  getLogger,
  isCompositeDbName,
  dbNameLogCategory,
  extractErrorMessage,
  extractErrorLogData,
} = require('dbgate-tools');
const requireEngineDriver = require('../utility/requireEngineDriver');
const { connectUtility } = require('../utility/connectUtility');
const { handleProcessCommunication } = require('../utility/processComm');
const { SqlGenerator } = require('dbgate-tools');
const generateDeploySql = require('../shell/generateDeploySql');
const { dumpSqlSelect } = require('dbgate-sqltree');

const logger = getLogger('dbconnProcess');

let dbhan;
let storedConnection;
let afterConnectCallbacks = [];
let afterAnalyseCallbacks = [];
let analysedStructure = null;
let lastPing = null;
let lastStatusString = null;
let lastStatus = null;
let analysedTime = 0;
let serverVersion;

let statusCounter = 0;
function getStatusCounter() {
  statusCounter += 1;
  return statusCounter;
}

async function checkedAsyncCall(promise) {
  try {
    const res = await promise;
    return res;
  } catch (err) {
    setStatus({
      name: 'error',
      message: extractErrorMessage(err, 'Checked call error'),
    });
    // console.error(err);
    setTimeout(() => process.exit(1), 1000);
    throw err;
  }
}

let loadingModel = false;

async function handleFullRefresh() {
  if (storedConnection.useSeparateSchemas && !isCompositeDbName(dbhan?.database)) {
    resolveAnalysedPromises();
    // skip loading DB structure
    return;
  }

  loadingModel = true;
  const driver = requireEngineDriver(storedConnection);
  setStatusName('loadStructure');
  analysedStructure = await checkedAsyncCall(driver.analyseFull(dbhan, serverVersion));
  analysedTime = new Date().getTime();
  process.send({ msgtype: 'structure', structure: analysedStructure });
  process.send({ msgtype: 'structureTime', analysedTime });
  setStatusName('ok');

  loadingModel = false;
  resolveAnalysedPromises();
}

async function handleIncrementalRefresh(forceSend) {
  if (storedConnection.useSeparateSchemas && !isCompositeDbName(dbhan?.database)) {
    resolveAnalysedPromises();
    // skip loading DB structure
    return;
  }
  loadingModel = true;
  const driver = requireEngineDriver(storedConnection);
  setStatusName('checkStructure');
  const newStructure = await checkedAsyncCall(driver.analyseIncremental(dbhan, analysedStructure, serverVersion));
  analysedTime = new Date().getTime();
  if (newStructure != null) {
    analysedStructure = newStructure;
  }

  if (forceSend || newStructure != null) {
    process.send({ msgtype: 'structure', structure: analysedStructure });
  }

  process.send({ msgtype: 'structureTime', analysedTime });
  setStatusName('ok');
  loadingModel = false;
  resolveAnalysedPromises();
}

function handleSyncModel({ isFullRefresh }) {
  if (loadingModel) return;
  if (isFullRefresh) handleFullRefresh();
  else handleIncrementalRefresh();
}

function setStatus(status) {
  const newStatus = { ...lastStatus, ...status };
  const statusString = stableStringify(newStatus);
  if (lastStatusString != statusString) {
    process.send({ msgtype: 'status', status: { ...newStatus, counter: getStatusCounter() } });
    lastStatusString = statusString;
    lastStatus = newStatus;
  }
}

function setStatusName(name) {
  setStatus({ name, message: null });
}

async function readVersion() {
  const driver = requireEngineDriver(storedConnection);
  const version = await driver.getVersion(dbhan);
  logger.debug(`Got server version: ${version.version}`);
  process.send({ msgtype: 'version', version });
  serverVersion = version;
}

async function handleConnect({ connection, structure, globalSettings }) {
  storedConnection = connection;
  lastPing = new Date().getTime();

  if (!structure) setStatusName('pending');
  const driver = requireEngineDriver(storedConnection);
  dbhan = await checkedAsyncCall(connectUtility(driver, storedConnection, 'app'));
  logger.debug(
    `Connected to database, driver: ${storedConnection.engine}, separate schemas: ${
      storedConnection.useSeparateSchemas ? 'YES' : 'NO'
    }, 'DB: ${dbNameLogCategory(dbhan.database)} }`
  );
  dbhan.feedback = feedback => setStatus({ feedback });
  await checkedAsyncCall(readVersion());
  if (structure) {
    analysedStructure = structure;
    handleIncrementalRefresh(true);
  } else {
    handleFullRefresh();
  }

  if (extractBoolSettingsValue(globalSettings, 'connection.autoRefresh', false)) {
    setInterval(
      handleIncrementalRefresh,
      extractIntSettingsValue(globalSettings, 'connection.autoRefreshInterval', 30, 3, 3600) * 1000
    );
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

function waitStructure() {
  if (analysedStructure) return Promise.resolve();
  return new Promise((resolve, reject) => {
    afterAnalyseCallbacks.push([resolve, reject]);
  });
}

function resolveAnalysedPromises() {
  for (const [resolve] of afterAnalyseCallbacks) {
    resolve();
  }
  afterAnalyseCallbacks = [];
}

async function handleRunScript({ msgid, sql, useTransaction }, skipReadonlyCheck = false) {
  await waitConnected();
  const driver = requireEngineDriver(storedConnection);
  try {
    if (!skipReadonlyCheck) ensureExecuteCustomScript(driver);
    await driver.script(dbhan, sql, { useTransaction });
    process.send({ msgtype: 'response', msgid });
  } catch (err) {
    process.send({
      msgtype: 'response',
      msgid,
      errorMessage: extractErrorMessage(err, 'Error executing SQL script'),
    });
  }
}

async function handleRunOperation({ msgid, operation, useTransaction }, skipReadonlyCheck = false) {
  await waitConnected();
  const driver = requireEngineDriver(storedConnection);
  try {
    if (!skipReadonlyCheck) ensureExecuteCustomScript(driver);
    await driver.operation(dbhan, operation, { useTransaction });
    process.send({ msgtype: 'response', msgid });
  } catch (err) {
    process.send({
      msgtype: 'response',
      msgid,
      errorMessage: extractErrorMessage(err, 'Error executing DB operation'),
    });
  }
}

async function handleQueryData({ msgid, sql, range }, skipReadonlyCheck = false) {
  await waitConnected();
  const driver = requireEngineDriver(storedConnection);
  try {
    if (!skipReadonlyCheck) ensureExecuteCustomScript(driver);
    const res = await driver.query(dbhan, sql, { range });
    process.send({ msgtype: 'response', msgid, ...res });
  } catch (err) {
    process.send({
      msgtype: 'response',
      msgid,
      errorMessage: extractErrorMessage(err, 'Error executing SQL script'),
    });
  }
}

async function handleSqlSelect({ msgid, select }) {
  const driver = requireEngineDriver(storedConnection);
  const dmp = driver.createDumper();
  dumpSqlSelect(dmp, select);
  return handleQueryData({ msgid, sql: dmp.s, range: select.range }, true);
}

async function handleDriverDataCore(msgid, callMethod, { logName }) {
  await waitConnected();
  const driver = requireEngineDriver(storedConnection);
  try {
    const result = await callMethod(driver);
    process.send({ msgtype: 'response', msgid, result });
  } catch (err) {
    logger.error(extractErrorLogData(err, { logName }), `Error when handling message ${logName}`);
    process.send({ msgtype: 'response', msgid, errorMessage: extractErrorMessage(err, 'Error executing DB data') });
  }
}

async function handleSchemaList({ msgid }) {
  logger.debug('Loading schema list');
  return handleDriverDataCore(msgid, driver => driver.listSchemas(dbhan), { logName: 'listSchemas' });
}

async function handleCollectionData({ msgid, options }) {
  return handleDriverDataCore(msgid, driver => driver.readCollection(dbhan, options), { logName: 'readCollection' });
}

async function handleLoadKeys({ msgid, root, filter, limit }) {
  return handleDriverDataCore(msgid, driver => driver.loadKeys(dbhan, root, filter, limit), { logName: 'loadKeys' });
}

async function handleExportKeys({ msgid, options }) {
  return handleDriverDataCore(msgid, driver => driver.exportKeys(dbhan, options), { logName: 'exportKeys' });
}

async function handleLoadKeyInfo({ msgid, key }) {
  return handleDriverDataCore(msgid, driver => driver.loadKeyInfo(dbhan, key), { logName: 'loadKeyInfo' });
}

async function handleCallMethod({ msgid, method, args }) {
  return handleDriverDataCore(
    msgid,
    driver => {
      if (storedConnection.isReadOnly) {
        throw new Error('Connection is read only, cannot call custom methods');
      }

      ensureExecuteCustomScript(driver);
      return driver.callMethod(dbhan, method, args);
    },
    { logName: `callMethod:${method}` }
  );
}

async function handleLoadKeyTableRange({ msgid, key, cursor, count }) {
  return handleDriverDataCore(msgid, driver => driver.loadKeyTableRange(dbhan, key, cursor, count), {
    logName: 'loadKeyTableRange',
  });
}

async function handleLoadFieldValues({ msgid, schemaName, pureName, field, search, dataType }) {
  return handleDriverDataCore(
    msgid,
    driver => driver.loadFieldValues(dbhan, { schemaName, pureName }, field, search, dataType),
    {
      logName: 'loadFieldValues',
    }
  );
}

function ensureExecuteCustomScript(driver) {
  if (driver.readOnlySessions) {
    return;
  }
  if (storedConnection.isReadOnly) {
    throw new Error('Connection is read only');
  }
}

async function handleUpdateCollection({ msgid, changeSet }) {
  await waitConnected();
  const driver = requireEngineDriver(storedConnection);
  try {
    ensureExecuteCustomScript(driver);
    const result = await driver.updateCollection(dbhan, changeSet);
    process.send({ msgtype: 'response', msgid, result });
  } catch (err) {
    process.send({ msgtype: 'response', msgid, errorMessage: extractErrorMessage(err, 'Error updating collection') });
  }
}

async function handleSqlPreview({ msgid, objects, options }) {
  await waitStructure();
  const driver = requireEngineDriver(storedConnection);

  try {
    const dmp = driver.createDumper();
    const generator = new SqlGenerator(analysedStructure, options, objects, dmp, driver, dbhan);

    await generator.dump();
    process.send({ msgtype: 'response', msgid, sql: dmp.s, isTruncated: generator.isTruncated });
    if (generator.isUnhandledException) {
      setTimeout(async () => {
        logger.error('Exiting because of unhandled exception');
        await driver.close(dbhan);
        process.exit(0);
      }, 500);
    }
  } catch (err) {
    console.error(err);
    process.send({
      msgtype: 'response',
      msgid,
      isError: true,
      errorMessage: extractErrorMessage(err, 'Error generating SQL preview'),
    });
  }
}

async function handleGenerateDeploySql({ msgid, modelFolder }) {
  await waitStructure();

  try {
    const res = await generateDeploySql({
      systemConnection: dbhan,
      connection: storedConnection,
      analysedStructure,
      modelFolder,
    });
    process.send({ ...res, msgtype: 'response', msgid });
  } catch (err) {
    process.send({
      msgtype: 'response',
      msgid,
      isError: true,
      errorMessage: extractErrorMessage(err, 'Error generating deploy SQL'),
    });
  }
}

// async function handleRunCommand({ msgid, sql }) {
//   await waitConnected();
//   const driver = engines(storedConnection);
//   const res = await driver.query(systemConnection, sql);
//   process.send({ msgtype: 'response', msgid, ...res });
// }

function handlePing() {
  lastPing = new Date().getTime();
}

const messageHandlers = {
  connect: handleConnect,
  queryData: handleQueryData,
  runScript: handleRunScript,
  runOperation: handleRunOperation,
  updateCollection: handleUpdateCollection,
  collectionData: handleCollectionData,
  loadKeys: handleLoadKeys,
  loadKeyInfo: handleLoadKeyInfo,
  callMethod: handleCallMethod,
  loadKeyTableRange: handleLoadKeyTableRange,
  sqlPreview: handleSqlPreview,
  ping: handlePing,
  syncModel: handleSyncModel,
  generateDeploySql: handleGenerateDeploySql,
  loadFieldValues: handleLoadFieldValues,
  sqlSelect: handleSqlSelect,
  exportKeys: handleExportKeys,
  schemaList: handleSchemaList,
  // runCommand: handleRunCommand,
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
      logger.info('Database connection not alive, exiting');
      const driver = requireEngineDriver(storedConnection);
      await driver.close(dbhan);
      process.exit(0);
    }
  }, 10 * 1000);

  process.on('message', async message => {
    if (handleProcessCommunication(message)) return;
    try {
      await handleMessage(message);
    } catch (err) {
      logger.error(extractErrorLogData(err), 'Error in DB connection');
      process.send({
        msgtype: 'error',
        error: extractErrorMessage(err, 'Error processing message'),
        msgid: message?.msgid,
      });
    }
  });
}

module.exports = { start };
