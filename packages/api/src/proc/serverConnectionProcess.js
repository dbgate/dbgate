const stableStringify = require('json-stable-stringify');
const { extractBoolSettingsValue, extractIntSettingsValue } = require('dbgate-tools');
const childProcessChecker = require('../utility/childProcessChecker');
const requireEngineDriver = require('../utility/requireEngineDriver');
const { decryptConnection } = require('../utility/crypting');
const connectUtility = require('../utility/connectUtility');
const { handleProcessCommunication } = require('../utility/processComm');

let systemConnection;
let storedConnection;
let lastDatabases = null;
let lastStatus = null;
let lastPing = null;

async function handleRefresh() {
  const driver = requireEngineDriver(storedConnection);
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

async function readVersion() {
  const driver = requireEngineDriver(storedConnection);
  const version = await driver.getVersion(systemConnection);
  process.send({ msgtype: 'version', version });
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
    systemConnection = await connectUtility(driver, storedConnection);
    readVersion();
    handleRefresh();
    if (extractBoolSettingsValue(globalSettings, 'connection.autoRefresh', true)) {
      setInterval(handleRefresh, extractIntSettingsValue(globalSettings, 'connection.autoRefreshInterval', 30, 5, 3600) * 1000);
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

function handlePing() {
  lastPing = new Date().getTime();
}

async function handleCreateDatabase({ name }) {
  const driver = requireEngineDriver(storedConnection);
  systemConnection = await connectUtility(driver, storedConnection);
  console.log(`RUNNING SCRIPT: CREATE DATABASE ${driver.dialect.quoteIdentifier(name)}`);
  if (driver.createDatabase) {
    await driver.createDatabase(systemConnection, name);
  } else {
    await driver.query(systemConnection, `CREATE DATABASE ${driver.dialect.quoteIdentifier(name)}`);
  }
  await handleRefresh();
}

const messageHandlers = {
  connect: handleConnect,
  ping: handlePing,
  createDatabase: handleCreateDatabase,
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
      console.log('Server connection not alive, exiting');
      process.exit(0);
    }
  }, 60 * 1000);

  process.on('message', async message => {
    if (handleProcessCommunication(message)) return;
    try {
      await handleMessage(message);
    } catch (err) {
      setStatus({
        name: 'error',
        message: err.message,
      });
    }
  });
}

module.exports = { start };
