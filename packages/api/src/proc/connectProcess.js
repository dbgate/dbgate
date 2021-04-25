const childProcessChecker = require('../utility/childProcessChecker');
const requireEngineDriver = require('../utility/requireEngineDriver');
const connectUtility = require('../utility/connectUtility');
const { handleProcessCommunication } = require('../utility/processComm');
const _ = require('lodash');

function pickSafeConnectionInfo(connection) {
  return _.mapValues(connection, (v, k) => {
    if (k == 'engine' || k == 'port' || k == 'authType' || k == 'sshMode' || k == 'passwordMode') return v;
    if (v === null || v === true || v === false) return v;
    if (v) return '***';
    return undefined;
  });
}

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
      const conn = await connectUtility(driver, connection);
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
