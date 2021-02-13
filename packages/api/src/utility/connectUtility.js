const { SSHConnection } = require('node-ssh-forward');
const portfinder = require('portfinder');
const { decryptConnection } = require('./crypting');
const { getSshTunnel } = require('./sshTunnel');
const { getSshTunnelProxy } = require('./sshTunnelProxy');

async function connectUtility(driver, storedConnection) {
  let connection = decryptConnection(storedConnection);
  if (connection.useSshTunnel) {
    const localPort = await getSshTunnelProxy(connection);
    // const sshConfig = {
    //   endHost: connection.sshHost || '',
    //   endPort: connection.sshPort || 22,
    //   bastionHost: '',
    //   agentForward: false,
    //   passphrase: undefined,
    //   username: connection.sshLogin,
    //   password: connection.sshPassword,
    //   skipAutoPrivateKey: true,
    //   noReadline: true,
    // };

    // const sshConn = new SSHConnection(sshConfig);
    // const localPort = await portfinder.getPortPromise({ port: 10000, stopPort: 60000 });
    // // workaround for `getPortPromise` not releasing the port quickly enough
    // await new Promise(resolve => setTimeout(resolve, 500));
    // const tunnelConfig = {
    //   fromPort: localPort,
    //   toPort: connection.port,
    //   toHost: connection.server,
    // };
    // const tunnel = await sshConn.forward(tunnelConfig);
    // console.log(`Created SSH tunnel to ${connection.sshHost}-${connection.server}:${connection.port}, using local port ${localPort}`)

    connection = {
      ...connection,
      server: '127.0.0.1',
      port: localPort,
    };
  }

  const conn = await driver.connect(connection);
  return conn;
}

module.exports = connectUtility;
