const engines = require('@dbgate/engines');
const uuidv1 = require('uuid/v1');
const path = require('path');
const fs = require('fs');

const driverConnect = require('../utility/driverConnect');
const { jsldir } = require('../utility/directories');

let systemConnection;
let storedConnection;
let afterConnectCallbacks = [];

class StreamHandler {
  constructor() {
    this.recordset = this.recordset.bind(this);
    this.row = this.row.bind(this);
    this.error = this.error.bind(this);
    this.done = this.done.bind(this);
    this.info = this.info.bind(this);
  }

  closeCurrentStream() {
    if (this.currentStream) {
      this.currentStream.end();
      this.currentStream = null;
    }
  }

  recordset(columns) {
    this.closeCurrentStream();
    this.jslid = uuidv1();
    this.currentFile = path.join(jsldir(), `${this.jslid}.jsonl`);
    this.currentStream = fs.createWriteStream(this.currentFile);
    fs.writeFileSync(`${this.currentFile}.info`, JSON.stringify(columns));
    process.send({ msgtype: 'recordset', jslid: this.jslid });
  }
  row(row) {
    // console.log('ACCEPT ROW', row);
    this.currentStream.write(JSON.stringify(row) + '\n');
  }
  error(error) {
    process.send({ msgtype: 'error', error });
  }
  done(result) {
    this.closeCurrentStream();
    process.send({ msgtype: 'done', result });
  }
  info(info) {
    process.send({ msgtype: 'info', info });
  }
}

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

  const handler = new StreamHandler();
  await driver.stream(systemConnection, sql, handler);
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
