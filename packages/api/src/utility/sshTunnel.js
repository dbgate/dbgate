const portfinder = require('portfinder');
const stableStringify = require('json-stable-stringify');
const _ = require('lodash');
const AsyncLock = require('async-lock');
const lock = new AsyncLock();
const { fork } = require('child_process');
const processArgs = require('../utility/processArgs');
const { getLogger, extractErrorLogData } = require('dbgate-tools');
const pipeForkLogs = require('./pipeForkLogs');
const logger = getLogger('sshTunnel');

const sshTunnelCache = {};

const CONNECTION_FIELDS = [
  'sshHost',
  'sshPort',
  'sshLogin',
  'sshPassword',
  'sshMode',
  'sshKeyfile',
  'sshBastionHost',
  'sshKeyfilePassword',
];
const TUNNEL_FIELDS = [...CONNECTION_FIELDS, 'server', 'port'];

function callForwardProcess(connection, tunnelConfig, tunnelCacheKey) {
  let subprocess = fork(
    global['API_PACKAGE'] || process.argv[1],
    ['--is-forked-api', '--start-process', 'sshForwardProcess', ...processArgs.getPassArgs()],
    {
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    }
  );
  pipeForkLogs(subprocess);

  try {
    subprocess.send({
      msgtype: 'connect',
      connection,
      tunnelConfig,
    });
  } catch (err) {
    logger.error(extractErrorLogData(err), 'Error connecting SSH');
  }
  return new Promise((resolve, reject) => {
    let promiseHandled = false;
    subprocess.on('message', resp => {
      // @ts-ignore
      const { msgtype, errorMessage } = resp;
      if (msgtype == 'connected') {
        resolve(subprocess);
        promiseHandled = true;
      }
      if (msgtype == 'error') {
        reject(new Error(errorMessage));
        promiseHandled = true;
      }
    });
    subprocess.on('exit', code => {
      logger.info('SSH forward process exited');
      delete sshTunnelCache[tunnelCacheKey];
      if (!promiseHandled) {
        reject(new Error('SSH forward process exited, try to change "Local host address for SSH connections" in Settings/Connections'));
      }
    });
  });
}

async function getSshTunnel(connection) {
  const config = require('../controllers/config');

  const tunnelCacheKey = stableStringify(_.pick(connection, TUNNEL_FIELDS));
  const globalSettings = await config.getSettings();

  return await lock.acquire(tunnelCacheKey, async () => {
    if (sshTunnelCache[tunnelCacheKey]) return sshTunnelCache[tunnelCacheKey];
    const localPort = await portfinder.getPortPromise({ port: 10000, stopPort: 60000 });
    const localHost = globalSettings?.['connection.sshBindHost'] || '127.0.0.1';
    // workaround for `getPortPromise` not releasing the port quickly enough
    await new Promise(resolve => setTimeout(resolve, 500));
    const tunnelConfig = {
      fromPort: localPort,
      fromHost: localHost,
      toPort: connection.port,
      toHost: connection.server,
    };
    try {
      logger.info(
        `Creating SSH tunnel to ${connection.sshHost}-${connection.server}:${connection.port}, using local port ${localPort}`
      );

      const subprocess = await callForwardProcess(connection, tunnelConfig, tunnelCacheKey);

      logger.info(
        `Created SSH tunnel to ${connection.sshHost}-${connection.server}:${connection.port}, using local port ${localPort}`
      );

      sshTunnelCache[tunnelCacheKey] = {
        state: 'ok',
        localPort,
        localHost,
        subprocess,
      };
      return sshTunnelCache[tunnelCacheKey];
    } catch (err) {
      logger.error(extractErrorLogData(err), 'Error creating SSH tunnel:');
      // error is not cached
      return {
        state: 'error',
        message: err.message,
      };
    }
  });
}

module.exports = {
  getSshTunnel,
};
