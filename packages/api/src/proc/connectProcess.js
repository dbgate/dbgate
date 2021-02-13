const childProcessChecker = require('../utility/childProcessChecker');
const requireEngineDriver = require('../utility/requireEngineDriver');
const connectUtility = require('../utility/connectUtility');
const { handleProcessCommunication } = require('../utility/processComm');

function start() {
  childProcessChecker();
  process.on('message', async connection => {
    if (handleProcessCommunication(connection)) return;
    try {
      const driver = requireEngineDriver(connection);
      const conn = await connectUtility(driver, connection);
      const res = await driver.getVersion(conn);
      process.send({ msgtype: 'connected', ...res });
    } catch (e) {
      console.error(e);
      process.send({ msgtype: 'error', error: e.message });
    }
  });
}

module.exports = { start };
