const engines = require('@dbgate/engines');
const driverConnect = require('../utility/driverConnect')

let systemConnection;
let storedConnection;

async function handleRefreshDatabases() {
  const driver = engines(storedConnection);
  const databases = await driver.listDatabases(systemConnection);
  process.send({ msgtype: 'databases', databases });
}

async function handleConnect(connection) {
  storedConnection = connection;

  const driver = engines(storedConnection);
  systemConnection = await driverConnect(driver, storedConnection);
  handleRefreshDatabases();
  setInterval(handleRefreshDatabases, 30 * 1000);
}

const messageHandlers = {
  connect: handleConnect,
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
