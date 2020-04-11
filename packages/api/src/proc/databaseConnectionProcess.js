const engines = require('@dbgate/engines');
const driverConnect = require('../utility/driverConnect');

let systemConnection;
let storedConnection;
let afterConnectCallbacks = [];
let analysedStructure = null;

async function handleFullRefresh() {
  const driver = engines(storedConnection);
  analysedStructure = await driver.analyseFull(systemConnection);
  process.send({ msgtype: 'structure', structure: analysedStructure });
}

async function handleIncrementalRefresh() {
  const driver = engines(storedConnection);
  const newStructure = await driver.analyseIncremental(systemConnection, analysedStructure);
  if (newStructure != null) {
    analysedStructure = newStructure;
    process.send({ msgtype: 'structure', structure: analysedStructure });
  }
}

async function handleConnect(connection) {
  storedConnection = connection;

  const driver = engines(storedConnection);
  systemConnection = await driverConnect(driver, storedConnection);
  handleFullRefresh();
  setInterval(handleIncrementalRefresh, 10 * 1000);
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

const messageHandlers = {
  connect: handleConnect,
  queryData: handleQueryData,
  // runCommand: handleRunCommand,
};

async function handleMessage({ msgtype, ...other }) {
  const handler = messageHandlers[msgtype];
  await handler(other);
}

function start() {
  process.on('message', async (message) => {
    try {
      await handleMessage(message);
    } catch (e) {
      process.send({ msgtype: 'error', error: e.message });
    }
  });
}

module.exports = { start };
