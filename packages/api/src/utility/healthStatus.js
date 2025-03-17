const os = require('os');

const databaseConnections = require('../controllers/databaseConnections');
const serverConnections = require('../controllers/serverConnections');
const sessions = require('../controllers/sessions');
const runners = require('../controllers/runners');

async function getHealthStatus() {
  const memory = process.memoryUsage();

  return {
    status: 'ok',
    databaseConnectionCount: databaseConnections.opened.length,
    serverConnectionCount: serverConnections.opened.length,
    sessionCount: sessions.opened.length,
    memory,
    systemMemory: {
      total: os.totalmem(),
      free: os.freemem(),
    },
    runProcessCount: runners.opened.length,
  };
}

module.exports = getHealthStatus;
