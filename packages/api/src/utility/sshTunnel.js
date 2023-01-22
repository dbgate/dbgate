const portfinder = require('portfinder');
const stableStringify = require('json-stable-stringify');
const _ = require('lodash');
const AsyncLock = require('async-lock');
const lock = new AsyncLock();
const { fork } = require('child_process');
const processArgs = require('../utility/processArgs');
const { getLogger } = require('dbgate-tools');
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

  subprocess.send({
    msgtype: 'connect',
    connection,
    tunnelConfig,
  });
  return new Promise((resolve, reject) => {
    subprocess.on('message', resp => {
      // @ts-ignore
      const { msgtype, errorMessage } = resp;
      if (msgtype == 'connected') {
        resolve(subprocess);
      }
      if (msgtype == 'error') {
        reject(errorMessage);
      }
    });
    subprocess.on('exit', code => {
      logger.info('SSH forward process exited');
      delete sshTunnelCache[tunnelCacheKey];
    });
  });
}

async function getSshTunnel(connection) {
  const tunnelCacheKey = stableStringify(_.pick(connection, TUNNEL_FIELDS));

  return await lock.acquire(tunnelCacheKey, async () => {
    if (sshTunnelCache[tunnelCacheKey]) return sshTunnelCache[tunnelCacheKey];
    const localPort = await portfinder.getPortPromise({ port: 10000, stopPort: 60000 });
    // workaround for `getPortPromise` not releasing the port quickly enough
    await new Promise(resolve => setTimeout(resolve, 500));
    const tunnelConfig = {
      fromPort: localPort,
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
        subprocess,
      };
      return sshTunnelCache[tunnelCacheKey];
    } catch (err) {
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
