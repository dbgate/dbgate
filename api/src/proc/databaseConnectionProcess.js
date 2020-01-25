const engines = require('../engines');

let systemConnection;
let storedConnection;
let afterConnectCallbacks = [];

async function handleFullRefresh() {
  const driver = engines(storedConnection);
  const structure = await driver.analyseFull(systemConnection);
  process.send({ msgtype: 'structure', structure });
}

async function handleConnect(connection) {
  storedConnection = connection;

  const driver = engines(storedConnection);
  systemConnection = await driver.connect(storedConnection);
  handleFullRefresh();
  setInterval(handleFullRefresh, 30 * 1000);
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

async function handleTableData({ msgid, schemaName, pureName }) {
  await waitConnected();
  const driver = engines(storedConnection);
  const res = await driver.query(systemConnection, `SELECT TOP(100) * FROM ${pureName}`);
  process.send({ msgtype: 'response', msgid, ...res });
}

const messageHandlers = {
  connect: handleConnect,
  tableData: handleTableData,
};

async function handleMessage({ msgtype, ...other }) {
  const handler = messageHandlers[msgtype];
  await handler(other);
}

process.on('message', async message => {
  try {
    await handleMessage(message);
  } catch (e) {
    process.send({ msgtype: 'error', error: e.message });
  }
});
