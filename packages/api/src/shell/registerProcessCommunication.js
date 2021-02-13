const { handleProcessCommunication } = require('../utility/processComm');

async function registerProcessCommunication() {
  process.on('message', async message => {
    handleProcessCommunication(message);
  });
}

module.exports = registerProcessCommunication;
