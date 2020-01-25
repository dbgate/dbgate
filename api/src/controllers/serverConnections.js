
const connections = require('./connections');
const socket = require('../utility/socket');
const { fork } = require('child_process');

module.exports = {
  opened: [],

  handle_databases(conid, { databases }) {
    const existing = this.opened.find(x => x.conid == conid);
    if (!existing) return;
    existing.databases = databases;
    socket.emit(`database-list-changed-${conid}`);
  },
  handle_error(conid, { error }) {
    console.log(error);
  },

  async ensureOpened(conid) {
    const existing = this.opened.find(x => x.conid == conid);
    if (existing) return existing;
    const connection = await connections.get({ conid });
    const subprocess = fork(`${__dirname}/../proc/serverConnectionProcess.js`);
    const newOpened = {
      conid,
      subprocess,
      databases: [],
      connection,
    };
    this.opened.push(newOpened);
    // @ts-ignore
    subprocess.on('message', ({ msgtype, ...message }) => {
      this[`handle_${msgtype}`](conid, message);
    });
    subprocess.send({ msgtype: 'connect', ...connection });
    return newOpened;
  },

  listDatabases_meta: 'get',
  async listDatabases({ conid }) {
    const opened = await this.ensureOpened(conid);
    return opened.databases;
  },
};
