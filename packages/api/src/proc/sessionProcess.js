const engines = require('@dbgate/engines');
const driverConnect = require('../utility/driverConnect');

let systemConnection;
let storedConnection;
let afterConnectCallbacks = [];

async function handleConnect(connection) {
  storedConnection = connection;

  const driver = engines(storedConnection);
  systemConnection = await driverConnect(driver, storedConnection);
  for (const [resolve, reject] of afterConnectCallbacks) {
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

async function handleExecuteQuery({ sql }) {
  await waitConnected();
  const driver = engines(storedConnection);

  await driver.stream(systemConnection, sql, {
    recordset: (columns) => {
      process.send({ msgtype: 'recordset', columns });
    },
    row: (row) => {
      process.send({ msgtype: 'row', row });
    },
    error: (error) => {
      process.send({ msgtype: 'error', error });
    },
    done: (result) => {
      process.send({ msgtype: 'done', result });
    },
    info: (info) => {
      process.send({ msgtype: 'info', info });
    },
  });
}

const messageHandlers = {
  connect: handleConnect,
  executeQuery: handleExecuteQuery,
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
