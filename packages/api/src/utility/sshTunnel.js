const { SSHConnection } = require('node-ssh-forward');
const fs = require('fs-extra');
const portfinder = require('portfinder');
const stableStringify = require('json-stable-stringify');
const _ = require('lodash');
const platformInfo = require('./platformInfo');
const AsyncLock = require('async-lock');
const lock = new AsyncLock();

const sshConnectionCache = {};
const sshTunnelCache = {};

const CONNECTION_FIELDS = [
  'sshHost',
  'sshPort',
  'sshLogin',
  'sshPassword',
  'sshMode',
  'sshKeyFile',
  'sshBastionHost',
  'sshKeyFilePassword',
];
const TUNNEL_FIELDS = [...CONNECTION_FIELDS, 'server', 'port'];

async function getSshConnection(connection) {
  const connectionCacheKey = stableStringify(_.pick(connection, CONNECTION_FIELDS));
  if (sshConnectionCache[connectionCacheKey]) return sshConnectionCache[connectionCacheKey];

  const sshConfig = {
    endHost: connection.sshHost || '',
    endPort: connection.sshPort || 22,
    bastionHost: connection.sshBastionHost || '',
    agentForward: connection.sshMode == 'agent',
    passphrase: connection.sshMode == 'keyFile' ? connection.sshKeyFilePassword : undefined,
    username: connection.sshLogin,
    password: connection.sshMode == 'userPassword' ? connection.sshPassword : undefined,
    agentSocket: connection.sshMode == 'agent' ? platformInfo.sshAuthSock : undefined,
    privateKey:
      connection.sshMode == 'keyFile' && connection.sshKeyfile ? await fs.readFile(connection.sshKeyfile) : undefined,
    skipAutoPrivateKey: true,
    noReadline: true,
  };

  const sshConn = new SSHConnection(sshConfig);
  sshConnectionCache[connectionCacheKey] = sshConn;
  return sshConn;
}

async function getSshTunnel(connection) {
  const tunnelCacheKey = stableStringify(_.pick(connection, TUNNEL_FIELDS));

  return await lock.acquire(tunnelCacheKey, async () => {
    const sshConn = await getSshConnection(connection);
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
      console.log(
        `Creating SSH tunnel to ${connection.sshHost}-${connection.server}:${connection.port}, using local port ${localPort}`
      );

      const tunnel = await sshConn.forward(tunnelConfig);
      console.log(
        `Created SSH tunnel to ${connection.sshHost}-${connection.server}:${connection.port}, using local port ${localPort}`
      );

      sshTunnelCache[tunnelCacheKey] = {
        state: 'ok',
        localPort,
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
