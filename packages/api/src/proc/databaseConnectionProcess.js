const stableStringify = require('json-stable-stringify');
const { splitQuery } = require('dbgate-query-splitter');
const childProcessChecker = require('../utility/childProcessChecker');
const { extractBoolSettingsValue, extractIntSettingsValue } = require('dbgate-tools');
const requireEngineDriver = require('../utility/requireEngineDriver');
const connectUtility = require('../utility/connectUtility');
const { handleProcessCommunication } = require('../utility/processComm');
const { SqlGenerator } = require('dbgate-tools');
const generateDeploySql = require('../shell/generateDeploySql');
const { dumpSqlSelect } = require('dbgate-sqltree');

let systemConnection;
let storedConnection;
let afterConnectCallbacks = [];
let afterAnalyseCallbacks = [];
let analysedStructure = null;
let lastPing = null;
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
      message: err.message,
    });
    // console.error(err);
    setTimeout(() => process.exit(1), 1000);
    throw err;
  }
}

let loadingModel = false;

async function handleFullRefresh() {
  loadingModel = true;
  const driver = requireEngineDriver(storedConnection);
  setStatusName('loadStructure');
  analysedStructure = await checkedAsyncCall(driver.analyseFull(systemConnection, serverVersion));
  analysedTime = new Date().getTime();
  process.send({ msgtype: 'structure', structure: analysedStructure });
  process.send({ msgtype: 'structureTime', analysedTime });
  setStatusName('ok');

  loadingModel = false;
  resolveAnalysedPromises();
}

async function handleIncrementalRefresh(forceSend) {
  loadingModel = true;
  const driver = requireEngineDriver(storedConnection);
  setStatusName('checkStructure');
  const newStructure = await checkedAsyncCall(
    driver.analyseIncremental(systemConnection, analysedStructure, serverVersion)
  );
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

function handleSyncModel() {
  if (loadingModel) return;
  handleIncrementalRefresh();
}

function setStatus(status) {
  const statusString = stableStringify(status);
  if (lastStatus != statusString) {
    process.send({ msgtype: 'status', status: { ...status, counter: getStatusCounter() } });
    lastStatus = statusString;
  }
}

function setStatusName(name) {
  setStatus({ name });
}

async function readVersion() {
  const driver = requireEngineDriver(storedConnection);
  const version = await driver.getVersion(systemConnection);
  process.send({ msgtype: 'version', version });
  serverVersion = version;
}

async function handleConnect({ connection, structure, globalSettings }) {
  storedConnection = connection;
  lastPing = new Date().getTime();

  if (!structure) setStatusName('pending');
  const driver = requireEngineDriver(storedConnection);
  systemConnection = await checkedAsyncCall(connectUtility(driver, storedConnection, 'app'));
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
  if (systemConnection) return Promise.resolve();
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

async function handleRunScript({ msgid, sql }) {
  await waitConnected();
  const driver = requireEngineDriver(storedConnection);
  try {
    ensureExecuteCustomScript(driver);
    await driver.script(systemConnection, sql);
    process.send({ msgtype: 'response', msgid });
  } catch (err) {
    process.send({ msgtype: 'response', msgid, errorMessage: err.message });
  }
}

async function handleQueryData({ msgid, sql }) {
  await waitConnected();
  const driver = requireEngineDriver(storedConnection);
  try {
    ensureExecuteCustomScript(driver);
    const res = await driver.query(systemConnection, sql);
    process.send({ msgtype: 'response', msgid, ...res });
  } catch (err) {
    process.send({ msgtype: 'response', msgid, errorMessage: err.message });
  }
}

async function handleSqlSelect({ msgid, select }) {
  const driver = requireEngineDriver(storedConnection);
  const dmp = driver.createDumper();
  dumpSqlSelect(dmp, select);
  return handleQueryData({ msgid, sql: dmp.s });
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

async function handleCollectionData({ msgid, options }) {
  return handleDriverDataCore(msgid, driver => driver.readCollection(systemConnection, options));
}

async function handleLoadKeys({ msgid, root, filter }) {
  return handleDriverDataCore(msgid, driver => driver.loadKeys(systemConnection, root, filter));
}

async function handleExportKeys({ msgid, options }) {
  return handleDriverDataCore(msgid, driver => driver.exportKeys(systemConnection, options));
}

async function handleLoadKeyInfo({ msgid, key }) {
  return handleDriverDataCore(msgid, driver => driver.loadKeyInfo(systemConnection, key));
}

async function handleCallMethod({ msgid, method, args }) {
  return handleDriverDataCore(msgid, driver => {
    if (storedConnection.isReadOnly) {
      throw new Error('Connection is read only, cannot call custom methods');
    }

    ensureExecuteCustomScript(driver);
    return driver.callMethod(systemConnection, method, args);
  });
}

async function handleLoadKeyTableRange({ msgid, key, cursor, count }) {
  return handleDriverDataCore(msgid, driver => driver.loadKeyTableRange(systemConnection, key, cursor, count));
}

async function handleLoadFieldValues({ msgid, schemaName, pureName, field, search }) {
  return handleDriverDataCore(msgid, driver =>
    driver.loadFieldValues(systemConnection, { schemaName, pureName }, field, search)
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
    const result = await driver.updateCollection(systemConnection, changeSet);
    process.send({ msgtype: 'response', msgid, result });
  } catch (err) {
    process.send({ msgtype: 'response', msgid, errorMessage: err.message });
  }
}

async function handleSqlPreview({ msgid, objects, options }) {
  await waitStructure();
  const driver = requireEngineDriver(storedConnection);

  try {
    const dmp = driver.createDumper();
    const generator = new SqlGenerator(analysedStructure, options, objects, dmp, driver, systemConnection);

    await generator.dump();
    process.send({ msgtype: 'response', msgid, sql: dmp.s, isTruncated: generator.isTruncated });
    if (generator.isUnhandledException) {
      setTimeout(() => {
        console.log('Exiting because of unhandled exception');
        process.exit(0);
      }, 500);
    }
  } catch (err) {
    process.send({ msgtype: 'response', msgid, isError: true, errorMessage: err.message });
  }
}

async function handleGenerateDeploySql({ msgid, modelFolder }) {
  await waitStructure();

  try {
    const res = await generateDeploySql({
      systemConnection,
      connection: storedConnection,
      analysedStructure,
      modelFolder,
    });
    process.send({ ...res, msgtype: 'response', msgid });
  } catch (err) {
    process.send({ msgtype: 'response', msgid, isError: true, errorMessage: err.message });
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
  // runCommand: handleRunCommand,
};

async function handleMessage({ msgtype, ...other }) {
  const handler = messageHandlers[msgtype];
  await handler(other);
}

function start() {
  childProcessChecker();

  setInterval(() => {
    const time = new Date().getTime();
    if (time - lastPing > 120 * 1000) {
      console.log('Database connection not alive, exiting');
      process.exit(0);
    }
  }, 60 * 1000);

  process.on('message', async message => {
    if (handleProcessCommunication(message)) return;
    try {
      await handleMessage(message);
    } catch (e) {
      console.error('Error in DB connection', e);
      process.send({ msgtype: 'error', error: e.message });
    }
  });
}

module.exports = { start };
