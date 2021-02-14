const { handleProcessCommunication } = require('../utility/processComm');

async function initializeApiEnvironment() {
  process.on('message', async message => {
    handleProcessCommunication(message);
  });

  if (process.env.DBGATE_CWD) {
    process.chdir(process.env.DBGATE_CWD);
  }
}

module.exports = initializeApiEnvironment;
