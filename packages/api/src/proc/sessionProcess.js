const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const childProcessChecker = require('../utility/childProcessChecker');
const { splitQuery } = require('dbgate-query-splitter');

const { jsldir } = require('../utility/directories');
const requireEngineDriver = require('../utility/requireEngineDriver');
const { decryptConnection } = require('../utility/crypting');
const { connectUtility } = require('../utility/connectUtility');
const { handleProcessCommunication } = require('../utility/processComm');
const { getLogger, extractIntSettingsValue, extractBoolSettingsValue } = require('dbgate-tools');
const { handleQueryStream, QueryStreamTableWriter, allowExecuteCustomScript } = require('../utility/handleQueryStream');

const logger = getLogger('sessionProcess');

let dbhan;
let storedConnection;
let afterConnectCallbacks = [];
// let currentHandlers = [];
let lastPing = null;
let lastActivity = null;
let currentProfiler = null;
let executingScripts = 0;

async function handleConnect(connection) {
  storedConnection = connection;

  const driver = requireEngineDriver(storedConnection);
  dbhan = await connectUtility(driver, storedConnection, 'app');
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
  if (dbhan) return Promise.resolve();
  return new Promise((resolve, reject) => {
    afterConnectCallbacks.push([resolve, reject]);
  });
}

async function handleStartProfiler({ jslid }) {
  lastActivity = new Date().getTime();

  await waitConnected();
  const driver = requireEngineDriver(storedConnection);

  if (!allowExecuteCustomScript(storedConnection, driver)) {
    process.send({ msgtype: 'done' });
    return;
  }

  const writer = new QueryStreamTableWriter();
  writer.initializeFromReader(jslid);

  currentProfiler = await driver.startProfiler(dbhan, {
    row: data => writer.rowFromReader(data),
  });
  currentProfiler.writer = writer;
}

async function handleStopProfiler({ jslid }) {
  lastActivity = new Date().getTime();

  const driver = requireEngineDriver(storedConnection);
  currentProfiler.writer.close();
  driver.stopProfiler(dbhan, currentProfiler);
  currentProfiler = null;
}

async function handleExecuteControlCommand({ command }) {
  lastActivity = new Date().getTime();

  await waitConnected();
  const driver = requireEngineDriver(storedConnection);

  if (command == 'commitTransaction' && !allowExecuteCustomScript(storedConnection, driver)) {
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

  executingScripts++;
  try {
    const dmp = driver.createDumper();
    switch (command) {
      case 'commitTransaction':
        await dmp.commitTransaction();
        break;
      case 'rollbackTransaction':
        await dmp.rollbackTransaction();
        break;
      case 'beginTransaction':
        await dmp.beginTransaction();
        break;
    }
    await driver.query(dbhan, dmp.s, { discardResult: true });
    process.send({ msgtype: 'done', controlCommand: command });
  } finally {
    executingScripts--;
  }
}

async function handleExecuteQuery({ sql, autoCommit, autoDetectCharts, limitRows, frontMatter }) {
  lastActivity = new Date().getTime();

  await waitConnected();
  const driver = requireEngineDriver(storedConnection);

  if (!allowExecuteCustomScript(storedConnection, driver)) {
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

  executingScripts++;
  try {
    const queryStreamInfoHolder = {
      resultIndex: 0,
      canceled: false,
    };
    for (const sqlItem of splitQuery(sql, {
      ...driver.getQuerySplitterOptions('stream'),
      returnRichInfo: true,
    })) {
      await handleQueryStream(
        dbhan,
        driver,
        queryStreamInfoHolder,
        sqlItem,
        undefined,
        limitRows,
        frontMatter,
        autoDetectCharts
      );
      // const handler = new StreamHandler(resultIndex);
      // const stream = await driver.stream(systemConnection, sqlItem, handler);
      // handler.stream = stream;
      // resultIndex = handler.resultIndex;

      if (queryStreamInfoHolder.canceled) {
        break;
      }
    }
    process.send({ msgtype: 'done', autoCommit });
  } finally {
    executingScripts--;
  }
}

async function handleExecuteReader({ jslid, sql, fileName }) {
  lastActivity = new Date().getTime();

  await waitConnected();

  const driver = requireEngineDriver(storedConnection);

  if (fileName) {
    sql = fs.readFileSync(fileName, 'utf-8');
  } else {
    if (!allowExecuteCustomScript(storedConnection, driver)) {
      process.send({ msgtype: 'done' });
      return;
    }
  }

  const writer = new QueryStreamTableWriter();
  writer.initializeFromReader(jslid);

  const reader = await driver.readQuery(dbhan, sql);

  reader.on('data', data => {
    writer.rowFromReader(data);
  });
  reader.on('end', () => {
    writer.close(() => {
      process.send({ msgtype: 'done' });
    });
  });
}

function handlePing() {
  lastPing = new Date().getTime();
}

const messageHandlers = {
  connect: handleConnect,
  executeQuery: handleExecuteQuery,
  executeControlCommand: handleExecuteControlCommand,
  executeReader: handleExecuteReader,
  startProfiler: handleStartProfiler,
  stopProfiler: handleStopProfiler,
  ping: handlePing,
  // cancel: handleCancel,
};

async function handleMessage({ msgtype, ...other }) {
  const handler = messageHandlers[msgtype];
  await handler(other);
}

function start() {
  childProcessChecker();

  lastPing = new Date().getTime();

  setInterval(async () => {
    const time = new Date().getTime();
    if (time - lastPing > 25 * 1000) {
      logger.info('DBGM-00045 Session not alive, exiting');
      const driver = requireEngineDriver(storedConnection);
      await driver.close(dbhan);
      process.exit(0);
    }

    const useSessionTimeout =
      storedConnection && storedConnection.globalSettings
        ? extractBoolSettingsValue(storedConnection.globalSettings, 'session.autoClose', true)
        : false;
    const sessionTimeout =
      storedConnection && storedConnection.globalSettings
        ? extractIntSettingsValue(storedConnection.globalSettings, 'session.autoCloseTimeout', 15, 1, 120)
        : 15;
    if (
      useSessionTimeout &&
      time - lastActivity > sessionTimeout * 60 * 1000 &&
      !currentProfiler &&
      executingScripts == 0
    ) {
      logger.info('DBGM-00046 Session not active, exiting');
      const driver = requireEngineDriver(storedConnection);
      await driver.close(dbhan);
      process.exit(0);
    }
  }, 10 * 1000);

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
