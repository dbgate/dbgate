const uuidv1 = require('uuid/v1');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const childProcessChecker = require('../utility/childProcessChecker');
const { splitQuery } = require('dbgate-query-splitter');

const { jsldir } = require('../utility/directories');
const requireEngineDriver = require('../utility/requireEngineDriver');
const { decryptConnection } = require('../utility/crypting');
const connectUtility = require('../utility/connectUtility');
const { handleProcessCommunication } = require('../utility/processComm');

let systemConnection;
let storedConnection;
let afterConnectCallbacks = [];
// let currentHandlers = [];

class TableWriter {
  constructor() {
    this.currentRowCount = 0;
    this.currentChangeIndex = 1;
    this.initializedFile = false;
  }

  initializeFromQuery(structure, resultIndex) {
    this.jslid = uuidv1();
    this.currentFile = path.join(jsldir(), `${this.jslid}.jsonl`);
    fs.writeFileSync(
      this.currentFile,
      JSON.stringify({
        ...structure,
        __isStreamHeader: true,
      }) + '\n'
    );
    this.currentStream = fs.createWriteStream(this.currentFile, { flags: 'a' });
    this.writeCurrentStats(false, false);
    this.resultIndex = resultIndex;
    this.initializedFile = true;
    process.send({ msgtype: 'recordset', jslid: this.jslid, resultIndex });
  }

  initializeFromReader(jslid) {
    this.jslid = jslid;
    this.currentFile = path.join(jsldir(), `${this.jslid}.jsonl`);
    this.writeCurrentStats(false, false);
  }

  row(row) {
    // console.log('ACCEPT ROW', row);
    this.currentStream.write(JSON.stringify(row) + '\n');
    this.currentRowCount += 1;

    if (!this.plannedStats) {
      this.plannedStats = true;
      process.nextTick(() => {
        if (this.currentStream) this.currentStream.uncork();
        process.nextTick(() => this.writeCurrentStats(false, true));
        this.plannedStats = false;
      });
    }
  }

  rowFromReader(row) {
    if (!this.initializedFile) {
      process.send({ msgtype: 'initializeFile', jslid: this.jslid });
      this.initializedFile = true;

      fs.writeFileSync(this.currentFile, JSON.stringify(row) + '\n');
      this.currentStream = fs.createWriteStream(this.currentFile, { flags: 'a' });
      this.writeCurrentStats(false, false);
      this.initializedFile = true;
      return;
    }

    this.row(row);
  }

  writeCurrentStats(isFinished = false, emitEvent = false) {
    const stats = {
      rowCount: this.currentRowCount,
      changeIndex: this.currentChangeIndex,
      isFinished,
      jslid: this.jslid,
    };
    fs.writeFileSync(`${this.currentFile}.stats`, JSON.stringify(stats));
    this.currentChangeIndex += 1;
    if (emitEvent) {
      process.send({ msgtype: 'stats', ...stats });
    }
  }

  close(afterClose) {
    if (this.currentStream) {
      this.currentStream.end(() => {
        this.writeCurrentStats(true, true);
        if (afterClose) afterClose();
      });
    }
  }
}

class StreamHandler {
  constructor(resultIndexHolder, resolve) {
    this.recordset = this.recordset.bind(this);
    this.row = this.row.bind(this);
    // this.error = this.error.bind(this);
    this.done = this.done.bind(this);
    this.info = this.info.bind(this);

    // use this for cancelling - not implemented
    // this.stream = null;

    this.plannedStats = false;
    this.resultIndexHolder = resultIndexHolder;
    this.resolve = resolve;
    // currentHandlers = [...currentHandlers, this];
  }

  closeCurrentWriter() {
    if (this.currentWriter) {
      this.currentWriter.close();
      this.currentWriter = null;
    }
  }

  recordset(columns) {
    this.closeCurrentWriter();
    this.currentWriter = new TableWriter();
    this.currentWriter.initializeFromQuery(
      Array.isArray(columns) ? { columns } : columns,
      this.resultIndexHolder.value
    );
    this.resultIndexHolder.value += 1;

    // this.writeCurrentStats();

    // this.onRow = _.throttle((jslid) => {
    //   if (jslid == this.jslid) {
    //     this.writeCurrentStats(false, true);
    //   }
    // }, 500);
  }
  row(row) {
    if (this.currentWriter) this.currentWriter.row(row);
    else if (row.message) process.send({ msgtype: 'info', info: { message: row.message } });
    // this.onRow(this.jslid);
  }
  // error(error) {
  //   process.send({ msgtype: 'error', error });
  // }
  done(result) {
    this.closeCurrentWriter();
    // currentHandlers = currentHandlers.filter((x) => x != this);
    this.resolve();
  }
  info(info) {
    process.send({ msgtype: 'info', info });
  }
}

function handleStream(driver, resultIndexHolder, sql) {
  return new Promise((resolve, reject) => {
    const handler = new StreamHandler(resultIndexHolder, resolve);
    driver.stream(systemConnection, sql, handler);
  });
}

function allowExecuteCustomScript(driver) {
  if (driver.readOnlySessions) {
    return true;
  }
  if (storedConnection.isReadOnly) {
    return false;
    // throw new Error('Connection is read only');
  }
  return true;
}

async function handleConnect(connection) {
  storedConnection = connection;

  const driver = requireEngineDriver(storedConnection);
  systemConnection = await connectUtility(driver, storedConnection);
  for (const [resolve] of afterConnectCallbacks) {
    resolve();
  }
  afterConnectCallbacks = [];
}

// function handleCancel() {
//   for (const handler of currentHandlers) {
//     if (handler.stream) handler.stream.cancel();
//   }
// }

function waitConnected() {
  if (systemConnection) return Promise.resolve();
  return new Promise((resolve, reject) => {
    afterConnectCallbacks.push([resolve, reject]);
  });
}

async function handleExecuteQuery({ sql }) {
  await waitConnected();
  const driver = requireEngineDriver(storedConnection);

  if (!allowExecuteCustomScript(driver)) {
    process.send({
      msgtype: 'info',
      info: {
        message: 'Connection without read-only sessions is read only',
        severity: 'error',
      },
    });
    process.send({ msgtype: 'done', skipFinishedMessage: true });
    return;
    //process.send({ msgtype: 'error', error: e.message });
  }

  const resultIndexHolder = {
    value: 0,
  };
  for (const sqlItem of splitQuery(sql, driver.getQuerySplitterOptions('stream'))) {
    await handleStream(driver, resultIndexHolder, sqlItem);
    // const handler = new StreamHandler(resultIndex);
    // const stream = await driver.stream(systemConnection, sqlItem, handler);
    // handler.stream = stream;
    // resultIndex = handler.resultIndex;
  }
  process.send({ msgtype: 'done' });
}

async function handleExecuteReader({ jslid, sql, fileName }) {
  await waitConnected();

  const driver = requireEngineDriver(storedConnection);

  if (fileName) {
    sql = fs.readFileSync(fileName, 'utf-8');
  } else {
    if (!allowExecuteCustomScript(driver)) {
      process.send({ msgtype: 'done' });
      return;
    }
  }

  const writer = new TableWriter();
  writer.initializeFromReader(jslid);

  const reader = await driver.readQuery(systemConnection, sql);

  reader.on('data', data => {
    writer.rowFromReader(data);
  });
  reader.on('end', () => {
    writer.close(() => {
      process.send({ msgtype: 'done' });
    });
  });
}

const messageHandlers = {
  connect: handleConnect,
  executeQuery: handleExecuteQuery,
  executeReader: handleExecuteReader,
  // cancel: handleCancel,
};

async function handleMessage({ msgtype, ...other }) {
  const handler = messageHandlers[msgtype];
  await handler(other);
}

function start() {
  childProcessChecker();
  process.on('message', async message => {
    if (handleProcessCommunication(message)) return;
    try {
      await handleMessage(message);
    } catch (e) {
      process.send({
        msgtype: 'info',
        info: {
          message: e.message,
          severity: 'error',
        },
      });
      //process.send({ msgtype: 'error', error: e.message });
    }
  });
}

module.exports = { start };
