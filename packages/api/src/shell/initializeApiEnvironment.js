const { handleProcessCommunication } = require('../utility/processComm');

async function initializeApiEnvironment() {
  process.on('message', async message => {
    handleProcessCommunication(message);
  });
}

module.exports = initializeApiEnvironment;
