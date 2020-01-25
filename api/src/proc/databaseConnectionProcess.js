const engines = require('../engines');

let systemConnection;
let storedConnection;

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
}

async function handleTableData({ msgid, schemaName, pureName }) {
  const driver = engines(storedConnection);
  const res = await driver.query(systemConnection, `SELECT TOP(100) FROM ${pureName}`);
  process.send({ msgtype: 'response', msgid, rows: res });
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
