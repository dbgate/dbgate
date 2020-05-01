const engines = require('@dbgate/engines');
const stableStringify = require('json-stable-stringify');
const driverConnect = require('../utility/driverConnect');
const childProcessChecker = require('../utility/childProcessChecker');

let systemConnection;
let storedConnection;
let lastDatabases = null;
let lastStatus = null;
let lastPing = null;

async function handleRefresh() {
  const driver = engines(storedConnection);
  try {
    const databases = await driver.listDatabases(systemConnection);
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
    // console.error(err);
    setTimeout(() => process.exit(1), 1000);
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

async function handleConnect(connection) {
  storedConnection = connection;
  setStatusName('pending');
  lastPing = new Date().getTime();

  const driver = engines(storedConnection);
  try {
    systemConnection = await driverConnect(driver, storedConnection);
    handleRefresh();
    setInterval(handleRefresh, 30 * 1000);
  } catch (err) {
    setStatus({
      name: 'error',
      message: err.message,
    });
    // console.error(err);
    setTimeout(() => process.exit(1), 1000);
  }
}

function handlePing() {
  lastPing = new Date().getTime();
}

const messageHandlers = {
  connect: handleConnect,
  ping: handlePing,
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
