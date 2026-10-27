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
const { safeJsonParse, getLogger, extractErrorLogData } = require('dbgate-tools');
const platformInfo = require('../utility/platformInfo');
const {
  hasPermission,
  connectionHasPermission,
  testConnectionPermission,
  loadPermissionsFromRequest,
} = require('../utility/hasPermission');
const pipeForkLogs = require('../utility/pipeForkLogs');
const requireEngineDriver = require('../utility/requireEngineDriver');
const { getAuthProviderById } = require('../auth/authProvider');
const { startTokenChecking } = require('../utility/authProxy');
const { extractConnectionsFromEnv } = require('../utility/envtools');
const { MissingCredentialsError } = require('../utility/exceptions');

const logger = getLogger('connections');

let volatileConnections = {};
let pendingTestSubprocesses = {}; // Map of conid -> subprocess for MS Entra auth flows

// fields of an existing connection that any user allowed to use it may change - they do not
// change where or how the server connects (see testConnectionDefinitionPermission)
const SAFE_CONNECTION_FIELDS = ['displayName', 'parent', 'connectionColor', 'unsaved'];

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

      if (name.endsWith('.duckdb')) {
        res.databaseFile = name;
        res.engine = 'duckdb@dbgate-plugin-duckdb';
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
    const connections = extractConnectionsFromEnv(process.env);

    for (const conn of connections) {
      for (const prop in process.env) {
        if (prop.startsWith(`CONNECTION_${conn._id}_`)) {
          const name = prop.substring(`CONNECTION_${conn._id}_`.length);
          conn[name] = process.env[prop];
        }
      }
    }

    logger.info(
      { connections: connections.map(pickSafeConnectionInfo) },
      'DBGM-00005 Using connections from ENV variables'
    );
    const noengine = connections.filter(x => !x.engine);
    if (noengine.length > 0) {
      logger.warn(
        { connections: noengine.map(x => x._id) },
        'DBGM-00006 Invalid CONNECTIONS configuration, missing ENGINE for connection ID'
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
      this.datastore = new JsonLinesDatabase(
        path.join(dir, processArgs.runE2eTests ? 'connections-e2etests.jsonl' : 'connections.jsonl')
      );
    }
    await this.checkUnsavedConnectionsLimit();

    if (process.env.STORAGE_DATABASE) {
      const storage = require('./storage');
      try {
        await storage.fillStorageConnectionsFromEnv();
      } catch (err) {
        logger.error(extractErrorLogData(err), 'DBGM-00268 Error filling storage connections from env');
      }
    }
  },

  list_access: 'self',

  list_meta: true,
  async list(_params, req) {
    const storage = require('./storage');
    const loadedPermissions = await loadPermissionsFromRequest(req);

    const storageConnections = await storage.connections(req);
    if (storageConnections) {
      return storageConnections.map(maskConnection);
    }
    if (portalConnections) {
      if (platformInfo.allowShellConnection) return portalConnections.map(x => encryptConnection(x));
      return portalConnections.map(maskConnection).filter(x => connectionHasPermission(x, loadedPermissions));
    }
    return (await this.datastore.find()).filter(x => connectionHasPermission(x, loadedPermissions));
  },

  async getUsedEngines() {
    const storage = require('./storage');

    const storageEngines = await storage.getUsedEngines();
    if (storageEngines) {
      return storageEngines;
    }
    if (portalConnections) {
      return _.uniq(_.compact(portalConnections.map(x => x.engine)));
    }
    return _.uniq((await this.datastore.find()).map(x => x.engine));
  },

  // Checks that the caller may test or save the given connection definition, and returns the
  // definition to use. The definition comes from the client, so it can point anywhere the server
  // can reach (any host and port, server-local files). Defining a new connection needs
  // admin/connections or all-connections; an existing connection can be tested and saved by those
  // who have permission to use it, but only with its stored target - from the client, only the
  // fields in SAFE_CONNECTION_FIELDS are taken. Internal calls (no req) and the desktop app are
  // not restricted.
  async testConnectionDefinitionPermission(connection, req, { forSave = false } = {}) {
    if (!req) return connection;
    const loadedPermissions = await loadPermissionsFromRequest(req);
    if (hasPermission('admin/connections', loadedPermissions) || hasPermission('all-connections', loadedPermissions)) {
      return connection;
    }
    const conid = connection?._id;
    // save writes the local connection list, so only a connection stored there can be saved
    const existing = conid ? (forSave ? await this.datastore.get(conid) : await this.getCore({ conid })) : null;
    if (!existing) {
      throw new Error('DBGM-00000 Permission to define connections not granted');
    }
    await testConnectionPermission(conid, req, loadedPermissions);
    return { ...existing, ..._.pick(connection, SAFE_CONNECTION_FIELDS), _id: conid };
  },

  // Throws when the caller may not change these fields of an existing connection (see above)
  async testConnectionUpdatePermission(values, req) {
    if (!req) return;
    const loadedPermissions = await loadPermissionsFromRequest(req);
    if (hasPermission('admin/connections', loadedPermissions) || hasPermission('all-connections', loadedPermissions)) {
      return;
    }
    if (!_.isPlainObject(values) || Object.keys(values).some(key => !SAFE_CONNECTION_FIELDS.includes(key))) {
      throw new Error('DBGM-00000 Permission to change the connection definition not granted');
    }
  },

  // volatile connections (credentials entered by the user) get a new random id, which no
  // permission names; creating one needs permission for the connection it is based on
  isVolatileConnection(conid) {
    return !!volatileConnections[conid];
  },

  // Returns the connection ids from the list the caller may use (for pings, which take a list)
  async filterPermittedConnections(conidArray, req) {
    const res = [];
    for (const conid of _.uniq(_.isArray(conidArray) ? conidArray : [])) {
      if (conid == null || conid === '') continue;
      if (this.isVolatileConnection(conid)) {
        res.push(conid);
        continue;
      }
      try {
        await testConnectionPermission(conid, req);
        res.push(conid);
      } catch (err) {
        // not permitted - skipped
      }
    }
    return res;
  },

  test_access: 'self',

  test_meta: true,
  async test({ connection, requestDbList = false }, req) {
    connection = await this.testConnectionDefinitionPermission(connection, req);
    // required lazily, config requires this controller back
    const settings = await require('./config').getSettings();
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
        env: {
          ...process.env,
          NODE_NO_WARNINGS: settings?.['behaviour.useDiagnosticTools'] === true ? '0' : '1',
        },
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      }
    );
    pipeForkLogs(subprocess);
    subprocess.send({ ...connection, requestDbList });
    return new Promise((resolve, reject) => {
      let isWaitingForVolatile = false;

      const cleanup = () => {
        if (connection._id && pendingTestSubprocesses[connection._id]) {
          delete pendingTestSubprocesses[connection._id];
        }
      };

      subprocess.on('message', resp => {
        if (handleProcessCommunication(resp, subprocess)) return;
        // @ts-ignore
        const { msgtype, missingCredentialsDetail } = resp;
        if (msgtype == 'connected' || msgtype == 'error') {
          cleanup();
          resolve(resp);
        }
        if (msgtype == 'missingCredentials') {
          if (missingCredentialsDetail?.redirectToDbLogin) {
            // Store the subprocess for later when volatile connection is ready
            isWaitingForVolatile = true;
            pendingTestSubprocesses[connection._id] = {
              subprocess,
              requestDbList,
            };
            // Return immediately with redirectToDbLogin status in the old format
            resolve({
              missingCredentials: true,
              detail: {
                ...missingCredentialsDetail,
                keepErrorResponseFromApi: true,
              },
            });
            return;
          }
          reject(new MissingCredentialsError(missingCredentialsDetail));
        }
      });

      subprocess.on('exit', code => {
        // If exit happens while waiting for volatile, that's expected
        if (isWaitingForVolatile && code === 0) {
          cleanup();
          return;
        }
        cleanup();
        if (code !== 0) {
          reject(new Error(`Test subprocess exited with code ${code}`));
        }
      });

      subprocess.on('error', err => {
        cleanup();
        reject(err);
      });
    });
  },

  saveVolatile_access: 'self',

  saveVolatile_meta: true,
  async saveVolatile({ conid, user = undefined, password = undefined, accessToken = undefined, test = false }, req) {
    await testConnectionPermission(conid, req);
    const old = await this.getCore({ conid });
    const res = {
      ...old,
      _id: crypto.randomUUID(),
      password,
      accessToken,
      passwordMode: undefined,
      unsaved: true,
      useRedirectDbLogin: false,
    };
    if (old.passwordMode == 'askUser') {
      res.user = user;
    }

    if (test) {
      const testRes = await this.test({ connection: res });
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

      // Check if there's a pending test subprocess waiting for this volatile connection
      const pendingTest = pendingTestSubprocesses[conid];
      if (pendingTest) {
        const { subprocess, requestDbList } = pendingTest;
        try {
          // Send the volatile connection to the waiting subprocess
          subprocess.send({ ...res, requestDbList, isVolatileResolved: true });

          // Wait for the test result and emit it as an event
          subprocess.once('message', resp => {
            if (handleProcessCommunication(resp, subprocess)) return;
            const { msgtype } = resp;
            if (msgtype == 'connected' || msgtype == 'error') {
              // Emit SSE event with test result
              socket.emit(`connection-test-result-${conid}`, {
                ...resp,
                volatileConId: res._id,
              });
              delete pendingTestSubprocesses[conid];
            }
          });
        } catch (err) {
          logger.error(extractErrorLogData(err), 'DBGM-00118 Error sending volatile connection to test subprocess');
          socket.emit(`connection-test-result-${conid}`, {
            msgtype: 'error',
            error: err.message,
          });
          delete pendingTestSubprocesses[conid];
        }
      }

      return res;
    }
  },

  save_access: 'self',

  save_meta: true,
  async save(connection, req) {
    if (portalConnections) return;
    connection = await this.testConnectionDefinitionPermission(connection, req, { forSave: true });
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

  importFromArray(list) {
    this.datastore.transformAll(connections => {
      const mapped = connections.map(x => {
        const found = list.find(y => y._id == x._id);
        if (found) return found;
        return x;
      });
      return [...mapped, ...list.filter(x => !connections.find(y => y._id == x._id))];
    });
    socket.emitChanged('connection-list-changed');
  },

  async checkUnsavedConnectionsLimit() {
    if (!this.datastore) {
      return;
    }
    const MAX_UNSAVED_CONNECTIONS = 5;
    await this.datastore.transformAll(connections => {
      const count = connections.filter(x => x.unsaved).length;
      if (count > MAX_UNSAVED_CONNECTIONS) {
        const res = [];
        let unsavedToSkip = count - MAX_UNSAVED_CONNECTIONS;
        for (const item of connections) {
          if (item.unsaved) {
            if (unsavedToSkip > 0) {
              unsavedToSkip--;
            } else {
              res.push(item);
            }
          } else {
            res.push(item);
          }
        }
        return res;
      }
    });
  },

  update_access: 'self',

  update_meta: true,
  async update({ _id, values }, req) {
    if (portalConnections) return;
    await testConnectionPermission(_id, req);
    await this.testConnectionUpdatePermission(values, req);
    const res = await this.datastore.patch(_id, values);
    socket.emitChanged('connection-list-changed');
    return res;
  },

  batchChangeFolder_access: 'self',

  batchChangeFolder_meta: true,
  async batchChangeFolder({ folder, newFolder }, req) {
    // const updated = await this.datastore.find(x => x.parent == folder);
    // only connections the caller can see (as in list) are moved
    const loadedPermissions = await loadPermissionsFromRequest(req);
    const res = await this.datastore.updateAll(x =>
      x.parent == folder && connectionHasPermission(x, loadedPermissions) ? { ...x, parent: newFolder } : x
    );
    socket.emitChanged('connection-list-changed');
    return res;
  },

  updateDatabase_access: 'self',

  updateDatabase_meta: true,
  async updateDatabase({ conid, database, values }, req) {
    if (portalConnections) return;
    await testConnectionPermission(conid, req);
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

  delete_access: 'self',

  delete_meta: true,
  async delete(connection, req) {
    if (portalConnections) return;
    await testConnectionPermission(connection, req);
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

    const cloudMatch = conid.match(/^cloud\:\/\/(.+)\/(.+)$/);
    if (cloudMatch) {
      const { loadCachedCloudConnection } = require('../utility/cloudIntf');
      const conn = await loadCachedCloudConnection(cloudMatch[1], cloudMatch[2]);
      return conn;
    }

    const storage = require('./storage');

    const storageConnection = await storage.getConnection({ conid });
    if (storageConnection) {
      return mask ? maskConnection(storageConnection) : storageConnection;
    }

    if (portalConnections) {
      const res = portalConnections.find(x => x._id == conid) || null;
      if (res) {
        return mask && !platformInfo.allowShellConnection ? maskConnection(res) : encryptConnection(res);
      }
      if (!(process.send && processArgs.processDisplayName === 'script')) {
        return null;
      }
    }
    if (!portalConnections) {
      const res = await this.datastore.get(conid);
      if (res) return res;
    }

    // In a forked runner-script child process, ask the parent for connections that may be
    // volatile (in-memory only, e.g. ask-for-password).  We only do this when
    // there really is a parent (process.send exists) to avoid an infinite loop
    // when the parent's own getCore falls through here.
    // The check is intentionally narrow: only runner scripts pass
    // --process-display-name script, so connect/session/ssh-forward subprocesses
    // are not affected and continue to return null immediately.
    if (process.send && processArgs.processDisplayName === 'script') {
      const conn = await new Promise(resolve => {
        let resolved = false;

        const cleanup = () => {
          process.removeListener('message', handler);
          process.removeListener('disconnect', onDisconnect);
          clearTimeout(timeout);
        };

        const settle = value => {
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve(value);
          }
        };

        const handler = message => {
          if (message?.msgtype === 'volatile-connection-response' && message.conid === conid) {
            settle(message.conn || null);
          }
        };

        const onDisconnect = () => settle(null);

        const timeout = setTimeout(() => settle(null), 5000);
        // Don't let the timer alone keep the process alive if all other work is done
        timeout.unref();

        process.on('message', handler);
        process.once('disconnect', onDisconnect);

        try {
          process.send({ msgtype: 'get-volatile-connection', conid });
        } catch {
          settle(null);
        }
      });
      if (conn) {
        volatileConnections[conn._id] = conn; // cache for subsequent calls
        return conn;
      }
    }

    return null;
  },

  get_access: 'self',

  get_meta: true,
  async get({ conid }, req) {
    if (conid == '__model') {
      return {
        _id: '__model',
      };
    }
    if (!conid) {
      return null;
    }
    await testConnectionPermission(conid, req);
    return this.getCore({ conid, mask: true });
  },

  newSqliteDatabase_access: 'self',

  newSqliteDatabase_meta: true,
  async newSqliteDatabase({ file }, req) {
    await this.testConnectionDefinitionPermission(null, req);
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

  newDuckdbDatabase_access: 'self',

  newDuckdbDatabase_meta: true,
  async newDuckdbDatabase({ file }, req) {
    await this.testConnectionDefinitionPermission(null, req);
    const duckdbDir = path.join(filesdir(), 'duckdb');
    if (!(await fs.exists(duckdbDir))) {
      await fs.mkdir(duckdbDir);
    }
    const databaseFile = path.join(duckdbDir, `${file}.duckdb`);
    const res = await this.save({
      engine: 'duckdb@dbgate-plugin-duckdb',
      databaseFile,
      singleDatabase: true,
      defaultDatabase: `${file}.duckdb`,
    });
    return res;
  },

  dbloginWeb_access: 'public',

  dbloginWeb_meta: {
    raw: true,
    method: 'get',
  },
  async dbloginWeb(req, res) {
    const { conid, state, redirectUri } = req.query;
    const connection = await this.getCore({ conid });
    const driver = requireEngineDriver(connection);
    const authResp = await driver.getRedirectAuthUrl(connection, {
      redirectUri,
      state,
      client: 'web',
    });
    if (authResp?.url) {
      res.redirect(authResp.url);
      return;
    }
    res.json({ error: 'No URL returned from auth provider' });
  },

  dbloginApp_access: 'electron',

  dbloginApp_meta: true,
  async dbloginApp({ conid, state }, req) {
    // the volatile connection holds the user's database token, so its id goes only to the browser
    // tab that started the login (or only to the desktop app, which has no stream)
    const strmid = socket.getStrmidFromRequest(req) ?? (req ? '__no_stream__' : undefined);
    const connection = await this.getCore({ conid });
    const driver = requireEngineDriver(connection);
    const resp = await driver.getRedirectAuthUrl(connection, {
      state,
      client: 'app',
    });
    startTokenChecking(resp.sid, async token => {
      const volatile = await this.saveVolatile({ conid, accessToken: token });
      socket.emit('got-volatile-token', { savedConId: conid, volatileConId: volatile._id }, strmid);
    });
    return resp;
  },

  dbloginToken_access: { connection: 'conid' },

  dbloginToken_meta: true,
  async dbloginToken({ code, conid, strmid, redirectUri, sid }) {
    try {
      const connection = await this.getCore({ conid });
      const driver = requireEngineDriver(connection);
      const accessToken = await driver.getAuthTokenFromCode(connection, { sid, code, redirectUri });
      const volatile = await this.saveVolatile({ conid, accessToken });
      // console.log('******************************** WE HAVE ACCESS TOKEN', accessToken);
      // without the tab's stream id, nobody but the desktop app receives the volatile connection
      socket.emit('got-volatile-token', { savedConId: conid, volatileConId: volatile._id }, strmid || '__no_stream__');
      return { success: true };
    } catch (err) {
      logger.error(extractErrorLogData(err), 'DBGM-00100 Error getting DB token');
      return { error: err.message };
    }
  },

  dbloginAuthToken_access: 'public',

  dbloginAuthToken_meta: true,
  async dbloginAuthToken({ amoid, code, conid, redirectUri, sid }, req) {
    try {
      const connection = await this.getCore({ conid });
      const driver = requireEngineDriver(connection);
      const accessToken = await driver.getAuthTokenFromCode(connection, { code, redirectUri, sid });
      const volatile = await this.saveVolatile({ conid, accessToken });
      const authProvider = getAuthProviderById(amoid);
      const resp = await authProvider.login(null, null, { conid: volatile._id }, req);
      return resp;
    } catch (err) {
      logger.error(extractErrorLogData(err), 'DBGM-00101 Error getting DB token');
      return { error: err.message };
    }
  },

  dbloginAuth_access: 'public',

  dbloginAuth_meta: true,
  async dbloginAuth({ amoid, conid, user, password }, req) {
    // Database login: the connection chosen on the login page is the identity. It must be a
    // database login method, and a connection that this method offers on the login page.
    const provider = getAuthProviderById(amoid);
    if (!provider || provider.toJson()?.workflowType != 'database') {
      return { error: 'Login failed' };
    }
    const offered = ((await provider.getLoginPageConnections?.()) ?? []).find(x => x.conid == conid);
    if (!offered) {
      return { error: 'Login failed' };
    }

    if (user || password) {
      const saveResp = await this.saveVolatile({ conid, user, password, test: true });
      if (saveResp.msgtype == 'connected') {
        const loginResp = await provider.login(user, password, { conid: saveResp._id }, req);
        return loginResp;
      }
      return saveResp;
    }

    // user and password is stored in connection, volatile connection is not needed - only for
    // connections that do not ask for credentials (or use their own login page)
    if (offered.useRedirectDbLogin || ['askUser', 'askPassword'].includes(offered.passwordMode)) {
      return { error: 'Login failed' };
    }
    const loginResp = await provider.login(null, null, { conid }, req);
    return loginResp;
  },

  volatileDbloginFromAuth_access: { connection: 'conid' },

  volatileDbloginFromAuth_meta: true,
  async volatileDbloginFromAuth({ conid }, req) {
    const connection = await this.getCore({ conid });
    const driver = requireEngineDriver(connection);
    const accessToken = await driver.getAccessTokenFromAuth(connection, req);
    if (accessToken) {
      const volatile = await this.saveVolatile({ conid, accessToken });
      return volatile;
    }
    return null;
  },

  reloadConnectionList_access: 'user',

  reloadConnectionList_meta: true,
  async reloadConnectionList() {
    if (portalConnections) return;
    await this.datastore.unload();
  },
};
