const fs = require('fs-extra');
const platformInfo = require('../utility/platformInfo');
const childProcessChecker = require('../utility/childProcessChecker');
const { handleProcessCommunication } = require('../utility/processComm');
const { SSHConnection } = require('../utility/SSHConnection');
const { getLogger, extractErrorLogData } = require('dbgate-tools');

const logger = getLogger('sshProcess');

async function getSshConnection(connection) {
  const sshConfig = {
    endHost: connection.sshHost || '',
    endPort: connection.sshPort || 22,
    bastionHost: connection.sshBastionHost || '',
    agentForward: connection.sshMode == 'agent',
    passphrase: connection.sshMode == 'keyFile' ? connection.sshKeyfilePassword : undefined,
    username: connection.sshLogin,
    password: (connection.sshMode || 'userPassword') == 'userPassword' ? connection.sshPassword : undefined,
    agentSocket: connection.sshMode == 'agent' ? platformInfo.sshAuthSock : undefined,
    privateKey:
      connection.sshMode == 'keyFile' && (connection.sshKeyfile || platformInfo?.defaultKeyfile)
        ? await fs.readFile(connection.sshKeyfile || platformInfo?.defaultKeyfile)
        : undefined,
    skipAutoPrivateKey: true,
    noReadline: true,
  };

  const sshConn = new SSHConnection(sshConfig);
  return sshConn;
}

async function handleStart({ connection, tunnelConfig }) {
  try {
    const sshConn = await getSshConnection(connection);
    await sshConn.forward(tunnelConfig);

    process.send({
      msgtype: 'connected',
      connection,
      tunnelConfig,
    });
  } catch (err) {
    logger.error(extractErrorLogData(err), 'Error creating SSH tunnel connection:');

    process.send({
      msgtype: 'error',
      connection,
      tunnelConfig,
      errorMessage: err.message,
    });
  }
}

const messageHandlers = {
  connect: handleStart,
};

async function handleMessage({ msgtype, ...other }) {
  const handler = messageHandlers[msgtype];
  await handler(other);
}

function start() {
  childProcessChecker();
  process.on('message', async message => {
    if (handleProcessCommunication(message)) return;
    try {
      await handleMessage(message);
    } catch (e) {
      console.error('sshForwardProcess - unhandled error', e);
    }
  });
}

module.exports = { start };
