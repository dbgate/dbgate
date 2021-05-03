const uuidv1 = require('uuid/v1');
const connections = require('./connections');
const socket = require('../utility/socket');
const { fork } = require('child_process');
const { DatabaseAnalyser } = require('dbgate-tools');
const { handleProcessCommunication } = require('../utility/processComm');
const config = require('./config');

module.exports = {
  /** @type {import('dbgate-types').OpenedDatabaseConnection[]} */
  opened: [],
  closed: {},
  requests: {},

  handle_structure(conid, database, { structure }) {
    const existing = this.opened.find(x => x.conid == conid && x.database == database);
    if (!existing) return;
    existing.structure = structure;
    socket.emitChanged(`database-structure-changed-${conid}-${database}`);
  },
  handle_version(conid, database, { version }) {
    const existing = this.opened.find(x => x.conid == conid && x.database == database);
    if (!existing) return;
    existing.serverVersion = version;
    socket.emitChanged(`database-server-version-changed-${conid}-${database}`);
  },

  handle_error(conid, database, props) {
    const { error } = props;
    console.log(`Error in database connection ${conid}, database ${database}: ${error}`);
  },
  handle_response(conid, database, { msgid, ...response }) {
    const [resolve, reject] = this.requests[msgid];
    resolve(response);
    delete this.requests[msgid];
  },
  handle_status(conid, database, { status }) {
    const existing = this.opened.find(x => x.conid == conid && x.database == database);
    if (!existing) return;
    if (existing.status == status) return;
    existing.status = status;
    socket.emitChanged(`database-status-changed-${conid}-${database}`);
  },

  handle_ping() {},

  async ensureOpened(conid, database) {
    const existing = this.opened.find(x => x.conid == conid && x.database == database);
    if (existing) return existing;
    const connection = await connections.get({ conid });
    const subprocess = fork(process.argv[1], [
      '--start-process',
      'databaseConnectionProcess',
      ...process.argv.slice(3),
    ]);
    const lastClosed = this.closed[`${conid}/${database}`];
    const newOpened = {
      conid,
      database,
      subprocess,
      structure: lastClosed ? lastClosed.structure : DatabaseAnalyser.createEmptyStructure(),
      serverVersion: lastClosed ? lastClosed.serverVersion : null,
      connection,
      status: { name: 'pending' },
    };
    this.opened.push(newOpened);
    subprocess.on('message', message => {
      // @ts-ignore
      const { msgtype } = message;
      if (handleProcessCommunication(message, subprocess)) return;
      if (newOpened.disconnected) return;
      this[`handle_${msgtype}`](conid, database, message);
    });
    subprocess.on('exit', () => {
      if (newOpened.disconnected) return;
      this.close(conid, database, false);
    });

    subprocess.send({
      msgtype: 'connect',
      connection: { ...connection, database },
      structure: lastClosed ? lastClosed.structure : null,
      globalSettings: config.settingsValue
    });
    return newOpened;
  },

  /** @param {import('dbgate-types').OpenedDatabaseConnection} conn */
  sendRequest(conn, message) {
    const msgid = uuidv1();
    const promise = new Promise((resolve, reject) => {
      this.requests[msgid] = [resolve, reject];
      conn.subprocess.send({ msgid, ...message });
    });
    return promise;
  },

  queryData_meta: 'post',
  async queryData({ conid, database, sql }) {
    console.log(`Processing query, conid=${conid}, database=${database}, sql=${sql}`);
    const opened = await this.ensureOpened(conid, database);
    // if (opened && opened.status && opened.status.name == 'error') {
    //   return opened.status;
    // }
    const res = await this.sendRequest(opened, { msgtype: 'queryData', sql });
    return res;
  },

  collectionData_meta: 'post',
  async collectionData({ conid, database, options }) {
    const opened = await this.ensureOpened(conid, database);
    const res = await this.sendRequest(opened, { msgtype: 'collectionData', options });
    return res.result;
  },

  updateCollection_meta: 'post',
  async updateCollection({ conid, database, changeSet }) {
    const opened = await this.ensureOpened(conid, database);
    const res = await this.sendRequest(opened, { msgtype: 'updateCollection', changeSet });
    return res.result;
  },

  status_meta: 'get',
  async status({ conid, database }) {
    const existing = this.opened.find(x => x.conid == conid && x.database == database);
    if (existing) return existing.status;
    const lastClosed = this.closed[`${conid}/${database}`];
    if (lastClosed) return lastClosed.status;
    return {
      name: 'error',
      message: 'Not connected',
    };
  },

  ping_meta: 'post',
  async ping({ conid, database }) {
    let existing = this.opened.find(x => x.conid == conid && x.database == database);

    if (existing) {
      existing.subprocess.send({ msgtype: 'ping' });
    } else {
      existing = await this.ensureOpened(conid, database);
    }

    return {
      status: 'ok',
      connectionStatus: existing ? existing.status : null,
    };
  },

  refresh_meta: 'post',
  async refresh({ conid, database }) {
    this.close(conid, database);

    await this.ensureOpened(conid, database);
    return { status: 'ok' };
  },

  close(conid, database, kill = true) {
    const existing = this.opened.find(x => x.conid == conid && x.database == database);
    if (existing) {
      existing.disconnected = true;
      if (kill) existing.subprocess.kill();
      this.opened = this.opened.filter(x => x.conid != conid || x.database != database);
      this.closed[`${conid}/${database}`] = {
        status: {
          ...existing.status,
          name: 'error',
        },
        structure: existing.structure,
      };
      socket.emitChanged(`database-status-changed-${conid}-${database}`);
    }
  },

  structure_meta: 'get',
  async structure({ conid, database }) {
    const opened = await this.ensureOpened(conid, database);
    return opened.structure;
    // const existing = this.opened.find((x) => x.conid == conid && x.database == database);
    // if (existing) return existing.status;
    // return {
    //   name: 'error',
    //   message: 'Not connected',
    // };
  },

  serverVersion_meta: 'get',
  async serverVersion({ conid, database }) {
    const opened = await this.ensureOpened(conid, database);
    return opened.serverVersion;
  },

  sqlPreview_meta: 'post',
  async sqlPreview({ conid, database, objects, options }) {
    // wait for structure
    await this.structure({ conid, database });

    const opened = await this.ensureOpened(conid, database);
    const res = await this.sendRequest(opened, { msgtype: 'sqlPreview', objects, options });
    return res;
  },

  // runCommand_meta: 'post',
  // async runCommand({ conid, database, sql }) {
  //   console.log(`Running SQL command , conid=${conid}, database=${database}, sql=${sql}`);
  //   const opened = await this.ensureOpened(conid, database);
  //   const res = await this.sendRequest(opened, { msgtype: 'queryData', sql });
  //   return res;
  // },
};
