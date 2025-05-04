const os = require('os');

const databaseConnections = require('../controllers/databaseConnections');
const serverConnections = require('../controllers/serverConnections');
const sessions = require('../controllers/sessions');
const runners = require('../controllers/runners');

async function getHealthStatus() {
  const memory = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  return {
    status: 'ok',
    databaseConnectionCount: databaseConnections.opened.length,
    serverConnectionCount: serverConnections.opened.length,
    sessionCount: sessions.opened.length,
    runProcessCount: runners.opened.length,
    memory,
    cpuUsage,
    systemMemory: {
      total: os.totalmem(),
      free: os.freemem(),
    },
  };
}

async function getHealthStatusSprinx() {
  return {
    overallStatus: 'OK',
    timeStamp: new Date().toISOString(),
    timeStampUnix: Math.floor(Date.now() / 1000),
  };
}

module.exports = {
  getHealthStatus,
  getHealthStatusSprinx,
};
