const engines = require('@dbgate/engines');
const { Select } = require('@dbgate/sqltree');
const driverConnect = require('../utility/driverConnect');

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
  systemConnection = await driverConnect(driver, storedConnection);
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

async function handleQueryData({ msgid, sql }) {
  // const select = new Select();
  // if (driver.dialect.limitSelect) select.topRecords = 100;
  // if (driver.dialect.rangeSelect) select.range = { offset: 0, limit: 100 };
  // select.from = { schemaName, pureName };
  // select.selectAll = true;
  // const sql = select.toSql(driver);

  await waitConnected();
  const driver = engines(storedConnection);
  const res = await driver.query(systemConnection, sql);
  process.send({ msgtype: 'response', msgid, ...res });
}

const messageHandlers = {
  connect: handleConnect,
  queryData: handleQueryData,
};

async function handleMessage({ msgtype, ...other }) {
  const handler = messageHandlers[msgtype];
  await handler(other);
}

function start() {
  process.on('message', async message => {
    try {
      await handleMessage(message);
    } catch (e) {
      process.send({ msgtype: 'error', error: e.message });
    }
  });
}

module.exports = { start };
