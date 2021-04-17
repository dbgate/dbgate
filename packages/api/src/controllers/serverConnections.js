const connections = require('./connections');
const socket = require('../utility/socket');
const { fork } = require('child_process');
const _ = require('lodash');
const AsyncLock = require('async-lock');
const { handleProcessCommunication } = require('../utility/processComm');
const lock = new AsyncLock();

module.exports = {
  opened: [],
  closed: {},
  lastPinged: {},

  handle_databases(conid, { databases }) {
    const existing = this.opened.find(x => x.conid == conid);
    if (!existing) return;
    existing.databases = databases;
    socket.emitChanged(`database-list-changed-${conid}`);
  },
  handle_status(conid, { status }) {
    const existing = this.opened.find(x => x.conid == conid);
    if (!existing) return;
    existing.status = status;
    socket.emitChanged(`server-status-changed`);
  },
  handle_ping() {},

  async ensureOpened(conid) {
    const res = await lock.acquire(conid, async () => {
      const existing = this.opened.find(x => x.conid == conid);
      if (existing) return existing;
      const connection = await connections.get({ conid });
      const subprocess = fork(process.argv[1], [
        '--start-process',
        'serverConnectionProcess',
        ...process.argv.slice(3),
      ]);
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
      subprocess.on('message', message => {
        // @ts-ignore
        const { msgtype } = message;
        if (handleProcessCommunication(message, subprocess)) return;
        if (newOpened.disconnected) return;
        this[`handle_${msgtype}`](conid, message);
      });
      subprocess.on('exit', () => {
        if (newOpened.disconnected) return;
        this.close(conid, false);
      });
      subprocess.send({ msgtype: 'connect', ...connection });
      return newOpened;
    });
    return res;
  },

  close(conid, kill = true) {
    const existing = this.opened.find(x => x.conid == conid);
    if (existing) {
      existing.disconnected = true;
      if (kill) existing.subprocess.kill();
      this.opened = this.opened.filter(x => x.conid != conid);
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
    await Promise.all(
      _.uniq(connections).map(async conid => {
        const last = this.lastPinged[conid];
        if (last && new Date().getTime() - last < 30 * 1000) {
          return Promise.resolve();
        }
        this.lastPinged[conid] = new Date().getTime();
        const opened = await this.ensureOpened(conid);
        opened.subprocess.send({ msgtype: 'ping' });
      })
    );
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
