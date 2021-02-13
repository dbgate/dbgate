const { SSHConnection } = require('node-ssh-forward');
const portfinder = require('portfinder');
const stableStringify = require('json-stable-stringify');
const _ = require('lodash');

const sshConnectionCache = {};
const sshTunnelCache = {};

const CONNECTION_FIELDS = ['sshHost', 'sshPort', 'sshLogin', 'sshPassword'];
const TUNNEL_FIELDS = [...CONNECTION_FIELDS, 'server', 'port'];

async function getSshConnection(connection) {
  const connectionCacheKey = stableStringify(_.pick(connection, CONNECTION_FIELDS));
  if (sshConnectionCache[connectionCacheKey]) return sshConnectionCache[connectionCacheKey];

  const sshConfig = {
    endHost: connection.sshHost || '',
    endPort: connection.sshPort || 22,
    bastionHost: '',
    agentForward: false,
    passphrase: undefined,
    username: connection.sshLogin,
    password: connection.sshPassword,
    skipAutoPrivateKey: true,
    noReadline: true,
  };

  const sshConn = new SSHConnection(sshConfig);
  sshConnectionCache[connectionCacheKey] = sshConn;
  return sshConn;
}

async function getSshTunnel(connection) {
  const sshConn = await getSshConnection(connection);
  const tunnelCacheKey = stableStringify(_.pick(connection, TUNNEL_FIELDS));
  if (sshTunnelCache[tunnelCacheKey]) return sshTunnelCache[tunnelCacheKey].localPort;

  const localPort = await portfinder.getPortPromise({ port: 10000, stopPort: 60000 });
  // workaround for `getPortPromise` not releasing the port quickly enough
  await new Promise(resolve => setTimeout(resolve, 500));
  const tunnelConfig = {
    fromPort: localPort,
    toPort: connection.port,
    toHost: connection.server,
  };
  const tunnel = await sshConn.forward(tunnelConfig);
  console.log(
    `Created SSH tunnel to ${connection.sshHost}-${connection.server}:${connection.port}, using local port ${localPort}`
  );

  sshTunnelCache[tunnelCacheKey] = {
    tunnel,
    localPort,
  };

  return localPort;
}

module.exports = {
  getSshTunnel,
};
