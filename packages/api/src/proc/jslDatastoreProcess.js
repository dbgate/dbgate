const childProcessChecker = require('../utility/childProcessChecker');
const JsonLinesDatastore = require('../utility/JsonLinesDatastore');
const { handleProcessCommunication } = require('../utility/processComm');

let lastPing = null;
let datastore = new JsonLinesDatastore();

function handlePing() {
  lastPing = new Date().getTime();
}

function handleOpen({ file }) {
  handlePing();
  datastore = new JsonLinesDatastore(file);
}

async function handleRead({ msgid, offset, limit }) {
  handlePing();
  const rows = await datastore.getRows(offset, limit);
  process.send({ msgtype: 'response', msgid, rows });
}

async function handleNotify({ msgid }) {
  await datastore.notifyChanged();
  process.send({ msgtype: 'notify', msgid });
}

const messageHandlers = {
  open: handleOpen,
  read: handleRead,
  ping: handlePing,
  notify: handleNotify,
};

async function handleMessage({ msgtype, ...other }) {
  const handler = messageHandlers[msgtype];
  await handler(other);
}

function start() {
  childProcessChecker();

  setInterval(() => {
    const time = new Date().getTime();
    if (time - lastPing > 60 * 1000) {
      process.exit(0);
    }
  }, 60 * 1000);

  process.on('message', async message => {
    if (handleProcessCommunication(message)) return;
    try {
      await handleMessage(message);
    } catch (e) {
      process.send({ msgtype: 'error', error: e.message });
    }
  });
}

module.exports = { start };
