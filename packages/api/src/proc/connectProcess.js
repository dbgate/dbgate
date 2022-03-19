const childProcessChecker = require('../utility/childProcessChecker');
const requireEngineDriver = require('../utility/requireEngineDriver');
const connectUtility = require('../utility/connectUtility');
const { handleProcessCommunication } = require('../utility/processComm');
const { pickSafeConnectionInfo } = require('../utility/crypting');
const _ = require('lodash');

const formatErrorDetail = (e, connection) => `${e.stack}

Error JSON: ${JSON.stringify(e, undefined, 2)}

Connection: ${JSON.stringify(pickSafeConnectionInfo(connection), undefined, 2)}

Platform: ${process.platform}
`;

function start() {
  childProcessChecker();
  process.on('message', async connection => {
    if (handleProcessCommunication(connection)) return;
    try {
      const driver = requireEngineDriver(connection);
      const conn = await connectUtility(driver, connection, 'app');
      const res = await driver.getVersion(conn);
      process.send({ msgtype: 'connected', ...res });
    } catch (e) {
      console.error(e);
      process.send({
        msgtype: 'error',
        error: e.message,
        detail: formatErrorDetail(e, connection),
      });
    }
  });
}

module.exports = { start };
