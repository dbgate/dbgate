const stableStringify = require('json-stable-stringify');
const { extractBoolSettingsValue, extractIntSettingsValue, getLogger } = require('dbgate-tools');
const childProcessChecker = require('../utility/childProcessChecker');
const requireEngineDriver = require('../utility/requireEngineDriver');
const connectUtility = require('../utility/connectUtility');
const { handleProcessCommunication } = require('../utility/processComm');
const logger = getLogger('srvconnProcess');

let systemConnection;
let storedConnection;
let lastDatabases = null;
let lastStatus = null;
let lastPing = null;
let afterConnectCallbacks = [];

async function handleRefresh() {
  const driver = requireEngineDriver(storedConnection);
  try {
    const databases = await driver.listDatabases(systemConnection);
    setStatusName('ok');
    const databasesString = stableStringify(databases);
    console.log('************* DATABASES *************', databases);
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
    console.log('************* CONNECTING *************');
    systemConnection = await connectUtility(driver, storedConnection, 'app');
    console.log('************* VERSION *************');
    readVersion();
    console.log('************* REFRESH *************');
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
    // console.error(err);
    setTimeout(() => process.exit(1), 1000);
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

function handlePing() {
  lastPing = new Date().getTime();
}

async function handleDatabaseOp(op, { name }) {
  const driver = requireEngineDriver(storedConnection);
  systemConnection = await connectUtility(driver, storedConnection, 'app');
  if (driver[op]) {
    await driver[op](systemConnection, name);
  } else {
    const dmp = driver.createDumper();
    dmp[op](name);
    logger.info({ sql: dmp.s }, 'Running script');
    await driver.query(systemConnection, dmp.s);
  }
  await handleRefresh();
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
  return handleDriverDataCore(msgid, driver => driver.serverSummary(systemConnection));
}

async function handleSummaryCommand({ msgid, command, row }) {
  return handleDriverDataCore(msgid, driver => driver.summaryCommand(systemConnection, command, row));
}

const messageHandlers = {
  connect: handleConnect,
  ping: handlePing,
  serverSummary: handleServerSummary,
  summaryCommand: handleSummaryCommand,
  createDatabase: props => handleDatabaseOp('createDatabase', props),
  dropDatabase: props => handleDatabaseOp('dropDatabase', props),
};

async function handleMessage({ msgtype, ...other }) {
  const handler = messageHandlers[msgtype];
  await handler(other);
}

function start() {
  childProcessChecker();

  setInterval(() => {
    const time = new Date().getTime();
    if (time - lastPing > 40 * 1000) {
      logger.info('Server connection not alive, exiting');
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
    }
  });
}

module.exports = { start };
