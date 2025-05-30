const childProcessChecker = require('../utility/childProcessChecker');
const requireEngineDriver = require('../utility/requireEngineDriver');
const { connectUtility } = require('../utility/connectUtility');
const { handleProcessCommunication } = require('../utility/processComm');
const { pickSafeConnectionInfo } = require('../utility/crypting');
const _ = require('lodash');
const { getLogger, extractErrorLogData } = require('dbgate-tools');
const logger = getLogger('connectProcess');

const formatErrorDetail = (e, connection) => `${e.stack}

Error JSON: ${JSON.stringify(e, undefined, 2)}

Connection: ${JSON.stringify(pickSafeConnectionInfo(connection), undefined, 2)}

Platform: ${process.platform}
`;

function start() {
  childProcessChecker();
  process.on('message', async connection => {
    // @ts-ignore
    const { requestDbList } = connection;
    if (handleProcessCommunication(connection)) return;
    try {
      const driver = requireEngineDriver(connection);
      const dbhan = await connectUtility(driver, connection, 'app');
      let version = {
        version: 'Unknown',
      };
      version = await driver.getVersion(dbhan);
      let databases = undefined;
      if (requestDbList) {
        databases = await driver.listDatabases(dbhan);
      }
      process.send({ msgtype: 'connected', ...version, databases });
      await driver.close(dbhan);
    } catch (e) {
      console.error(e);
      process.send({
        msgtype: 'error',
        error: e.message,
        detail: formatErrorDetail(e, connection),
      });
    }

    process.exit(0);
  });
}

module.exports = { start };
