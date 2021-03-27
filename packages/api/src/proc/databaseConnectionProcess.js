const stableStringify = require('json-stable-stringify');
const childProcessChecker = require('../utility/childProcessChecker');
const requireEngineDriver = require('../utility/requireEngineDriver');
const connectUtility = require('../utility/connectUtility');
const { handleProcessCommunication } = require('../utility/processComm');
const { SqlGenerator } = require('dbgate-tools')

let systemConnection;
let storedConnection;
let afterConnectCallbacks = [];
let analysedStructure = null;
let lastPing = null;
let lastStatus = null;

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

async function handleFullRefresh() {
  const driver = requireEngineDriver(storedConnection);
  analysedStructure = await checkedAsyncCall(driver.analyseFull(systemConnection));
  process.send({ msgtype: 'structure', structure: analysedStructure });
  setStatusName('ok');
}

async function handleIncrementalRefresh() {
  const driver = requireEngineDriver(storedConnection);
  const newStructure = await checkedAsyncCall(driver.analyseIncremental(systemConnection, analysedStructure));
  if (newStructure != null) {
    analysedStructure = newStructure;
    process.send({ msgtype: 'structure', structure: analysedStructure });
  }
  setStatusName('ok');
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

async function handleConnect({ connection, structure }) {
  storedConnection = connection;
  lastPing = new Date().getTime();

  if (!structure) setStatusName('pending');
  const driver = requireEngineDriver(storedConnection);
  systemConnection = await checkedAsyncCall(connectUtility(driver, storedConnection));
  if (structure) {
    analysedStructure = structure;
    handleIncrementalRefresh();
  } else {
    handleFullRefresh();
  }
  setInterval(handleIncrementalRefresh, 30 * 1000);
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

async function handleQueryData({ msgid, sql }) {
  await waitConnected();
  const driver = requireEngineDriver(storedConnection);
  try {
    const res = await driver.query(systemConnection, sql);
    process.send({ msgtype: 'response', msgid, ...res });
  } catch (err) {
    process.send({ msgtype: 'response', msgid, errorMessage: err.message });
  }
}


async function handleSqlPreview({ msgid, objects, options }) {
  await waitConnected();
  const driver = requireEngineDriver(storedConnection);

  const dmp = driver.createDumper();
  const generator = new SqlGenerator(analysedStructure, options, objects, dmp, driver, systemConnection);
  await generator.dump();
  process.send({ msgtype: 'response', msgid, sql: dmp.s });
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
  sqlPreview: handleSqlPreview,
  ping: handlePing,
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
      process.send({ msgtype: 'error', error: e.message });
    }
  });
}

module.exports = { start };
