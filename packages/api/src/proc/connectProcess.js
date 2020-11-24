const childProcessChecker = require('../utility/childProcessChecker');
const requireEngineDriver = require('../utility/requireEngineDriver');

function start() {
  childProcessChecker();
  process.on('message', async (connection) => {
    try {
      const driver = requireEngineDriver(connection);
      const conn = await driver.connect(connection);
      const res = await driver.getVersion(conn);
      process.send({ msgtype: 'connected', ...res });
    } catch (e) {
      console.error(e);
      process.send({ msgtype: 'error', error: e.message });
    }
  });
}

module.exports = { start };
