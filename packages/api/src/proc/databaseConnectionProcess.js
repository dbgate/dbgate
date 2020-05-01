const engines = require('@dbgate/engines');
const stableStringify = require('json-stable-stringify');
const driverConnect = require('../utility/driverConnect');
const childProcessChecker = require('../utility/childProcessChecker');

let systemConnection;
let storedConnection;
let afterConnectCallbacks = [];
let analysedStructure = null;
let lastPing = null;
let lastStatus = null;

async function handleFullRefresh() {
  const driver = engines(storedConnection);
  analysedStructure = await driver.analyseFull(systemConnection);
  process.send({ msgtype: 'structure', structure: analysedStructure });
  setStatusName('ok');
}

async function handleIncrementalRefresh() {
  const driver = engines(storedConnection);
  const newStructure = await driver.analyseIncremental(systemConnection, analysedStructure);
  if (newStructure != null) {
    analysedStructure = newStructure;
    process.send({ msgtype: 'structure', structure: analysedStructure });
  }
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
  else setStatusName('ok');
  const driver = engines(storedConnection);
  systemConnection = await driverConnect(driver, storedConnection);
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
  const driver = engines(storedConnection);
  const res = await driver.query(systemConnection, sql);
  process.send({ msgtype: 'response', msgid, ...res });
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
    if (time - lastPing > 60 * 1000) {
      process.exit(0);
    }
  }, 60 * 1000);

  process.on('message', async (message) => {
    try {
      await handleMessage(message);
    } catch (e) {
      process.send({ msgtype: 'error', error: e.message });
    }
  });
}

module.exports = { start };
