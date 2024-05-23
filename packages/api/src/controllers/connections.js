const path = require('path');
const { fork } = require('child_process');
const _ = require('lodash');
const fs = require('fs-extra');
const crypto = require('crypto');

const { datadir, filesdir } = require('../utility/directories');
const socket = require('../utility/socket');
const { encryptConnection, maskConnection } = require('../utility/crypting');
const { handleProcessCommunication } = require('../utility/processComm');
const { pickSafeConnectionInfo } = require('../utility/crypting');
const JsonLinesDatabase = require('../utility/JsonLinesDatabase');

const processArgs = require('../utility/processArgs');
const { safeJsonParse, getLogger } = require('dbgate-tools');
const platformInfo = require('../utility/platformInfo');
const { connectionHasPermission, testConnectionPermission } = require('../utility/hasPermission');
const pipeForkLogs = require('../utility/pipeForkLogs');

const logger = getLogger('connections');

let volatileConnections = {};

function getNamedArgs() {
  const res = {};
  for (let i = 0; i < process.argv.length; i++) {
    const name = process.argv[i];
    if (name.startsWith('--')) {
      let value = process.argv[i + 1];
      if (value && value.startsWith('--')) value = null;
      res[name.substring(2)] = value == null ? true : value;
      i++;
    } else {
      if (name.endsWith('.db') || name.endsWith('.sqlite') || name.endsWith('.sqlite3')) {
        res.databaseFile = name;
        res.engine = 'sqlite@dbgate-plugin-sqlite';
      }
    }
  }
  return res;
}

function getDatabaseFileLabel(databaseFile) {
  if (!databaseFile) return databaseFile;
  const m = databaseFile.match(/[\/]([^\/]+)$/);
  if (m) return m[1];
  return databaseFile;
}

function getPortalCollections() {
  if (process.env.CONNECTIONS) {
    const connections = _.compact(process.env.CONNECTIONS.split(',')).map(id => ({
      _id: id,
      engine: process.env[`ENGINE_${id}`],
      server: process.env[`SERVER_${id}`],
      user: process.env[`USER_${id}`],
      password: process.env[`PASSWORD_${id}`],
      passwordMode: process.env[`PASSWORD_MODE_${id}`],
      port: process.env[`PORT_${id}`],
      databaseUrl: process.env[`URL_${id}`],
      useDatabaseUrl: !!process.env[`URL_${id}`],
      databaseFile: process.env[`FILE_${id}`],
      socketPath: process.env[`SOCKET_PATH_${id}`],
      authType: process.env[`AUTH_TYPE_${id}`] || (process.env[`SOCKET_PATH_${id}`] ? 'socket' : undefined),
      defaultDatabase:
        process.env[`DATABASE_${id}`] ||
        (process.env[`FILE_${id}`] ? getDatabaseFileLabel(process.env[`FILE_${id}`]) : null),
      singleDatabase: !!process.env[`DATABASE_${id}`] || !!process.env[`FILE_${id}`],
      displayName: process.env[`LABEL_${id}`],
      isReadOnly: process.env[`READONLY_${id}`],
      databases: process.env[`DBCONFIG_${id}`] ? safeJsonParse(process.env[`DBCONFIG_${id}`]) : null,
      parent: process.env[`PARENT_${id}`] || undefined,

      // SSH tunnel
      useSshTunnel: process.env[`USE_SSH_${id}`],
      sshHost: process.env[`SSH_HOST_${id}`],
      sshPort: process.env[`SSH_PORT_${id}`],
      sshMode: process.env[`SSH_MODE_${id}`],
      sshLogin: process.env[`SSH_LOGIN_${id}`],
      sshPassword: process.env[`SSH_PASSWORD_${id}`],
      sshKeyfile: process.env[`SSH_KEY_FILE_${id}`],
      sshKeyfilePassword: process.env[`SSH_KEY_FILE_PASSWORD_${id}`],

      // SSL
      useSsl: process.env[`USE_SSL_${id}`],
      sslCaFile: process.env[`SSL_CA_FILE_${id}`],
      sslCertFile: process.env[`SSL_CERT_FILE_${id}`],
      sslCertFilePassword: process.env[`SSL_CERT_FILE_PASSWORD_${id}`],
      sslKeyFile: process.env[`SSL_KEY_FILE_${id}`],
      sslRejectUnauthorized: process.env[`SSL_REJECT_UNAUTHORIZED_${id}`],
      trustServerCertificate: process.env[`SSL_TRUST_CERTIFICATE_${id}`],
    }));

    logger.info({ connections: connections.map(pickSafeConnectionInfo) }, 'Using connections from ENV variables');
    const noengine = connections.filter(x => !x.engine);
    if (noengine.length > 0) {
      logger.warn(
        { connections: noengine.map(x => x._id) },
        'Invalid CONNECTIONS configutation, missing ENGINE for connection ID'
      );
    }
    return connections;
  }

  const args = getNamedArgs();
  if (args.databaseFile) {
    return [
      {
        _id: 'argv',
        databaseFile: args.databaseFile,
        singleDatabase: true,
        defaultDatabase: getDatabaseFileLabel(args.databaseFile),
        engine: args.engine,
      },
    ];
  }
  if (args.databaseUrl) {
    return [
      {
        _id: 'argv',
        useDatabaseUrl: true,
        ...args,
      },
    ];
  }
  if (args.server) {
    return [
      {
        _id: 'argv',
        ...args,
      },
    ];
  }

  return null;
}

const portalConnections = getPortalCollections();

function getSingleDbConnection() {
  if (process.env.SINGLE_CONNECTION && process.env.SINGLE_DATABASE) {
    // @ts-ignore
    const connection = portalConnections.find(x => x._id == process.env.SINGLE_CONNECTION);
    return {
      connection,
      name: process.env.SINGLE_DATABASE,
    };
  }
  // @ts-ignore
  const arg0 = (portalConnections || []).find(x => x._id == 'argv');
  if (arg0) {
    // @ts-ignore
    if (arg0.singleDatabase) {
      return {
        connection: arg0,
        // @ts-ignore
        name: arg0.defaultDatabase,
      };
    }
  }
  return null;
}

function getSingleConnection() {
  if (getSingleDbConnection()) return null;
  if (process.env.SINGLE_CONNECTION) {
    // @ts-ignore
    const connection = portalConnections.find(x => x._id == process.env.SINGLE_CONNECTION);
    if (connection) {
      return connection;
    }
  }
  // @ts-ignore
  const arg0 = (portalConnections || []).find(x => x._id == 'argv');
  if (arg0) {
    return arg0;
  }
  return null;
}

const singleDbConnection = getSingleDbConnection();
const singleConnection = getSingleConnection();

module.exports = {
  datastore: null,
  opened: [],
  singleDbConnection,
  singleConnection,
  portalConnections,

  async _init() {
    const dir = datadir();
    if (!portalConnections) {
      // @ts-ignore
      this.datastore = new JsonLinesDatabase(path.join(dir, 'connections.jsonl'));
    }
  },

  list_meta: true,
  async list(_params, req) {
    if (portalConnections) {
      if (platformInfo.allowShellConnection) return portalConnections;
      return portalConnections.map(maskConnection).filter(x => connectionHasPermission(x, req));
    }
    return (await this.datastore.find()).filter(x => connectionHasPermission(x, req));
  },

  test_meta: true,
  test(connection) {
    const subprocess = fork(
      global['API_PACKAGE'] || process.argv[1],
      [
        '--is-forked-api',
        '--start-process',
        'connectProcess',
        ...processArgs.getPassArgs(),
        // ...process.argv.slice(3),
      ],
      {
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      }
    );
    pipeForkLogs(subprocess);
    subprocess.send(connection);
    return new Promise(resolve => {
      subprocess.on('message', resp => {
        if (handleProcessCommunication(resp, subprocess)) return;
        // @ts-ignore
        const { msgtype } = resp;
        if (msgtype == 'connected' || msgtype == 'error') {
          resolve(resp);
        }
      });
    });
  },

  saveVolatile_meta: true,
  async saveVolatile({ conid, user, password, test }) {
    const old = await this.getCore({ conid });
    const res = {
      ...old,
      _id: crypto.randomUUID(),
      password,
      passwordMode: undefined,
      unsaved: true,
    };
    if (old.passwordMode == 'askUser') {
      res.user = user;
    }

    if (test) {
      const testRes = await this.test(res);
      if (testRes.msgtype == 'connected') {
        volatileConnections[res._id] = res;
        return {
          ...res,
          msgtype: 'connected',
        };
      }
      return testRes;
    } else {
      volatileConnections[res._id] = res;
      return res;
    }
  },

  save_meta: true,
  async save(connection) {
    if (portalConnections) return;
    let res;
    const encrypted = encryptConnection(connection);
    if (connection._id) {
      res = await this.datastore.update(encrypted);
    } else {
      res = await this.datastore.insert(encrypted);
    }
    socket.emitChanged('connection-list-changed');
    socket.emitChanged('used-apps-changed');
    if (this._closeAll) {
      this._closeAll(connection._id);
    }
    // for (const db of connection.databases || []) {
    //   socket.emitChanged(`db-apps-changed-${connection._id}-${db.name}`);
    // }
    return res;
  },

  update_meta: true,
  async update({ _id, values }, req) {
    if (portalConnections) return;
    testConnectionPermission(_id, req);
    const res = await this.datastore.patch(_id, values);
    socket.emitChanged('connection-list-changed');
    return res;
  },

  batchChangeFolder_meta: true,
  async batchChangeFolder({ folder, newFolder }, req) {
    // const updated = await this.datastore.find(x => x.parent == folder);
    const res = await this.datastore.updateAll(x => (x.parent == folder ? { ...x, parent: newFolder } : x));
    socket.emitChanged('connection-list-changed');
    return res;
  },

  updateDatabase_meta: true,
  async updateDatabase({ conid, database, values }, req) {
    if (portalConnections) return;
    testConnectionPermission(conid, req);
    const conn = await this.datastore.get(conid);
    let databases = (conn && conn.databases) || [];
    if (databases.find(x => x.name == database)) {
      databases = databases.map(x => (x.name == database ? { ...x, ...values } : x));
    } else {
      databases = [...databases, { name: database, ...values }];
    }
    const res = await this.datastore.patch(conid, { databases });
    socket.emitChanged('connection-list-changed');
    socket.emitChanged('used-apps-changed');
    // socket.emitChanged(`db-apps-changed-${conid}-${database}`);
    return res;
  },

  delete_meta: true,
  async delete(connection, req) {
    if (portalConnections) return;
    testConnectionPermission(connection, req);
    const res = await this.datastore.remove(connection._id);
    socket.emitChanged('connection-list-changed');
    return res;
  },

  async getCore({ conid, mask = false }) {
    if (!conid) return null;
    const volatile = volatileConnections[conid];
    if (volatile) {
      return volatile;
    }
    if (portalConnections) {
      const res = portalConnections.find(x => x._id == conid) || null;
      return mask && !platformInfo.allowShellConnection ? maskConnection(res) : res;
    }
    const res = await this.datastore.get(conid);
    return res || null;
  },

  get_meta: true,
  async get({ conid }, req) {
    testConnectionPermission(conid, req);
    return this.getCore({ conid, mask: true });
  },

  newSqliteDatabase_meta: true,
  async newSqliteDatabase({ file }) {
    const sqliteDir = path.join(filesdir(), 'sqlite');
    if (!(await fs.exists(sqliteDir))) {
      await fs.mkdir(sqliteDir);
    }
    const databaseFile = path.join(sqliteDir, `${file}.sqlite`);
    const res = await this.save({
      engine: 'sqlite@dbgate-plugin-sqlite',
      databaseFile,
      singleDatabase: true,
      defaultDatabase: `${file}.sqlite`,
    });
    return res;
  },
};
