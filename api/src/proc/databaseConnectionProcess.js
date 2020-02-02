const engines = require('../engines');
const Select = require('../dmlf/select');

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

  const select = new Select();
  if (driver.dialect.limitSelect) select.topRecords = 100;
  if (driver.dialect.rangeSelect) select.range = { offset: 0, limit: 100 };
  select.from = { schemaName, pureName };
  select.selectAll = true;
  const sql = select.toSql(driver);
  console.log('SQL', sql);
  const res = await driver.query(systemConnection, sql);

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
