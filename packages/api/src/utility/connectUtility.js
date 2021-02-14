const { SSHConnection } = require('node-ssh-forward');
const portfinder = require('portfinder');
const fs = require('fs-extra');
const { decryptConnection } = require('./crypting');
const { getSshTunnel } = require('./sshTunnel');
const { getSshTunnelProxy } = require('./sshTunnelProxy');

async function connectUtility(driver, storedConnection) {
  const connection = {
    ...decryptConnection(storedConnection),
  };
  if (connection.useSshTunnel) {
    const tunnel = await getSshTunnelProxy(connection);
    if (tunnel.state == 'error') {
      throw new Error(tunnel.message);
    }

    connection.server = '127.0.0.1';
    connection.port = tunnel.localPort;
  }

  if (!connection.port && driver.defaultPort) connection.port = driver.defaultPort.toString();

  // SSL functionality - copied from https://github.com/beekeeper-studio/beekeeper-studio
  if (connection.useSsl) {
    connection.ssl = {};

    if (connection.sslCaFile) {
      connection.ssl.ca = await fs.readFile(connection.sslCaFile);
    }

    if (connection.sslCertFile) {
      connection.ssl.cert = await fs.readFile(connection.sslCertFile);
    }

    if (connection.sslKeyFile) {
      connection.ssl.key = await fs.readFile(connection.sslKeyFile);
    }

    if (!connection.ssl.key && !connection.ssl.ca && !connection.ssl.cert) {
      // TODO: provide this as an option in settings
      // or per-connection as 'reject self-signed certs'
      // How it works:
      // if false, cert can be self-signed
      // if true, has to be from a public CA
      // Heroku certs are self-signed.
      // if you provide ca/cert/key files, it overrides this
      connection.ssl.rejectUnauthorized = false;
    } else {
      connection.ssl.rejectUnauthorized = connection.sslRejectUnauthorized;
    }
  }

  const conn = await driver.connect(connection);
  return conn;
}

module.exports = connectUtility;
