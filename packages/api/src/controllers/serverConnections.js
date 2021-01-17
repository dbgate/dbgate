const connections = require('./connections');
const socket = require('../utility/socket');
const { fork } = require('child_process');
const _ = require('lodash');

module.exports = {
  opened: [],
  closed: {},

  handle_databases(conid, { databases }) {
    const existing = this.opened.find((x) => x.conid == conid);
    if (!existing) return;
    existing.databases = databases;
    socket.emitChanged(`database-list-changed-${conid}`);
  },
  handle_status(conid, { status }) {
    const existing = this.opened.find((x) => x.conid == conid);
    if (!existing) return;
    existing.status = status;
    socket.emitChanged(`server-status-changed`);
  },
  handle_ping() {},

  async ensureOpened(conid) {
    const existing = this.opened.find((x) => x.conid == conid);
    if (existing) return existing;
    const connection = await connections.get({ conid });
    const subprocess = fork(process.argv[1], ['serverConnectionProcess', ...process.argv.slice(3)]);
    const newOpened = {
      conid,
      subprocess,
      databases: [],
      connection,
      status: {
        name: 'pending',
      },
      disconnected: false,
    };
    this.opened.push(newOpened);
    delete this.closed[conid];
    socket.emitChanged(`server-status-changed`);
    // @ts-ignore
    subprocess.on('message', ({ msgtype, ...message }) => {
      if (newOpened.disconnected) return;
      this[`handle_${msgtype}`](conid, message);
    });
    subprocess.on('exit', () => {
      if (newOpened.disconnected) return;
      this.close(conid, false);
    });
    subprocess.send({ msgtype: 'connect', ...connection });
    return newOpened;
  },

  close(conid, kill = true) {
    const existing = this.opened.find((x) => x.conid == conid);
    if (existing) {
      existing.disconnected = true;
      if (kill) existing.subprocess.kill();
      this.opened = this.opened.filter((x) => x.conid != conid);
      this.closed[conid] = {
        ...existing.status,
        name: 'error',
      };
      socket.emitChanged(`server-status-changed`);
    }
  },

  listDatabases_meta: 'get',
  async listDatabases({ conid }) {
    const opened = await this.ensureOpened(conid);
    return opened.databases;
  },

  serverStatus_meta: 'get',
  async serverStatus() {
    return {
      ...this.closed,
      ..._.mapValues(_.keyBy(this.opened, 'conid'), 'status'),
    };
  },

  ping_meta: 'post',
  async ping({ connections }) {
    for (const conid of connections) {
      const opened = await this.ensureOpened(conid);
      opened.subprocess.send({ msgtype: 'ping' });
    }
    return { status: 'ok' };
  },

  refresh_meta: 'post',
  async refresh({ conid }) {
    this.close(conid);

    await this.ensureOpened(conid);
    return { status: 'ok' };
  },

  createDatabase_meta: 'post',
  async createDatabase({ conid, name }) {
    const opened = await this.ensureOpened(conid);
    opened.subprocess.send({ msgtype: 'createDatabase', name });
    return { status: 'ok' };
  },
};
