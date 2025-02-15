const fs = require('fs-extra');
const { decryptConnection } = require('./crypting');
const { getSshTunnelProxy } = require('./sshTunnelProxy');
const platformInfo = require('../utility/platformInfo');
const connections = require('../controllers/connections');
const _ = require('lodash');

async function loadConnection(driver, storedConnection, connectionMode) {
  const { allowShellConnection, allowConnectionFromEnvVariables } = platformInfo;

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

  if (allowConnectionFromEnvVariables) {
    return _.mapValues(storedConnection, (value, key) => {
      if (_.isString(value) && value.startsWith('${') && value.endsWith('}')) {
        return process.env[value.slice(2, -1)];
      }
      return value;
    });
  }

  return storedConnection;
}

async function extractConnectionSslParams(connection) {
  /** @type {any} */
  let ssl = undefined;
  if (connection.useSsl) {
    ssl = {};

    if (connection.sslCaFile) {
      ssl.ca = await fs.readFile(connection.sslCaFile);
      ssl.sslCaFile = connection.sslCaFile;
    }

    if (connection.sslCertFile) {
      ssl.cert = await fs.readFile(connection.sslCertFile);
      ssl.sslCertFile = connection.sslCertFile;
    }

    if (connection.sslKeyFile) {
      ssl.key = await fs.readFile(connection.sslKeyFile);
      ssl.sslKeyFile = connection.sslKeyFile;
    }

    if (connection.sslCertFilePassword) {
      ssl.password = connection.sslCertFilePassword;
    }

    if (!ssl.key && !ssl.ca && !ssl.cert) {
      // TODO: provide this as an option in settings
      // or per-connection as 'reject self-signed certs'
      // How it works:
      // if false, cert can be self-signed
      // if true, has to be from a public CA
      // Heroku certs are self-signed.
      // if you provide ca/cert/key files, it overrides this
      ssl.rejectUnauthorized = false;
    } else {
      ssl.rejectUnauthorized = connection.sslRejectUnauthorized;
    }
  }
  return ssl;
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

    connection.server = tunnel.localHost;
    connection.port = tunnel.localPort;
  }

  connection.ssl = await extractConnectionSslParams(connection);

  const conn = await driver.connect({ ...connection, ...additionalOptions });
  return conn;
}

module.exports = {
  extractConnectionSslParams,
  connectUtility,
};
