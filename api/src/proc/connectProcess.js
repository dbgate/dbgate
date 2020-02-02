const engines = require('@dbgate/engines');
const driverConnect = require('../utility/driverConnect')

process.on('message', async connection => {
  try {
    const driver = engines(connection);
    const conn = await driverConnect(driver, connection);
    const res = await driver.getVersion(conn);
    process.send(res);
  } catch (e) {
    console.log(e);
    process.send({ msgtype: 'error', error: e.message });
  }
});
