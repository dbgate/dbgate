const engines = require('dbgate-engines');
const driverConnect = require('../utility/driverConnect');
const childProcessChecker = require('../utility/childProcessChecker');

function start() {
  childProcessChecker();
  process.on('message', async (connection) => {
    try {
      const driver = engines(connection);
      const conn = await driverConnect(driver, connection);
      const res = await driver.getVersion(conn);
      process.send({ msgtype: 'connected', ...res });
    } catch (e) {
      console.error(e);
      process.send({ msgtype: 'error', error: e.message });
    }
  });
}

module.exports = { start };
