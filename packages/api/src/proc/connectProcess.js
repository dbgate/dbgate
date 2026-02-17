const childProcessChecker = require('../utility/childProcessChecker');
const requireEngineDriver = require('../utility/requireEngineDriver');
const { connectUtility, getRestAuthFromConnection } = require('../utility/connectUtility');
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

  let isWaitingForVolatile = false;

  const handleConnection = async connection => {
    // @ts-ignore
    const { requestDbList } = connection;
    if (handleProcessCommunication(connection)) return;

    try {
      const driver = requireEngineDriver(connection);
      const connectionChanged = driver?.beforeConnectionSave ? driver.beforeConnectionSave(connection) : connection;
      if (driver?.databaseEngineTypes?.includes('rest')) {
        connectionChanged.restAuth = getRestAuthFromConnection(connection);
      }

      if (!connection.isVolatileResolved) {
        if (connectionChanged.useRedirectDbLogin) {
          process.send({
            msgtype: 'missingCredentials',
            missingCredentialsDetail: {
              // @ts-ignore
              conid: connection._id,
              redirectToDbLogin: true,
              keepErrorResponseFromApi: true,
            },
          });
          // Don't exit - wait for volatile connection to be sent
          isWaitingForVolatile = true;
          return;
        }
      }

      const dbhan = await connectUtility(driver, connectionChanged, 'app');
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
  };

  process.on('message', async connection => {
    // If we're waiting for volatile and receive a new connection, use it
    if (isWaitingForVolatile) {
      isWaitingForVolatile = false;
      await handleConnection(connection);
    } else {
      await handleConnection(connection);
    }
  });
}

module.exports = { start };
