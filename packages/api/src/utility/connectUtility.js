const fs = require('fs-extra');
const { decryptConnection } = require('./crypting');
const { getSshTunnelProxy } = require('./sshTunnelProxy');
const platformInfo = require('../utility/platformInfo');
const connections = require('../controllers/connections');

async function loadConnection(driver, storedConnection, connectionMode) {
  const { allowShellConnection } = platformInfo;

  if (connectionMode == 'app') {
    return storedConnection;
  }

  if (storedConnection._id || !allowShellConnection) {
    if (!storedConnection._id) {
      throw new Error('Missing connection _id');
    }

    await connections._init();
    const loaded = await connections.getCore({ conid: storedConnection._id });
    const loadedWithDb = {
      ...loaded,
      database: storedConnection.database,
    };

    if (loaded.isReadOnly) {
      if (connectionMode == 'read') return loadedWithDb;
      if (connectionMode == 'write') throw new Error('Cannot write readonly connection');
      if (connectionMode == 'script') {
        if (driver.readOnlySessions) return loadedWithDb;
        throw new Error('Cannot write readonly connection');
      }
    }
    return loadedWithDb;
  }
  return storedConnection;
}

async function connectUtility(driver, storedConnection, connectionMode, additionalOptions = null) {
  const connectionLoaded = await loadConnection(driver, storedConnection, connectionMode);

  const connection = {
    database: connectionLoaded.defaultDatabase,
    ...decryptConnection(connectionLoaded),
  };

  if (!connection.port && driver.defaultPort) connection.port = driver.defaultPort.toString();

  if (connection.useSshTunnel) {
    const tunnel = await getSshTunnelProxy(connection);
    if (tunnel.state == 'error') {
      throw new Error(tunnel.message);
    }

    connection.server = 'localhost';
    connection.port = tunnel.localPort;
  }

  // SSL functionality - copied from https://github.com/beekeeper-studio/beekeeper-studio
  if (connection.useSsl) {
    connection.ssl = {};

    if (connection.sslCaFile) {
      connection.ssl.ca = await fs.readFile(connection.sslCaFile);
      connection.ssl.sslCaFile = connection.sslCaFile;
    }

    if (connection.sslCertFile) {
      connection.ssl.cert = await fs.readFile(connection.sslCertFile);
      connection.ssl.sslCertFile = connection.sslCertFile;
    }

    if (connection.sslKeyFile) {
      connection.ssl.key = await fs.readFile(connection.sslKeyFile);
      connection.ssl.sslKeyFile = connection.sslKeyFile;
    }

    if (connection.sslCertFilePassword) {
      connection.ssl.password = connection.sslCertFilePassword;
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

  const conn = await driver.connect({ ...connection, ...additionalOptions });
  return conn;
}

module.exports = connectUtility;
