const { fork } = require('child_process');
const uuidv1 = require('uuid/v1');
const { handleProcessCommunication } = require('./processComm');

class DatastoreProxy {
  constructor(file) {
    this.subprocess = null;
    this.disconnected = false;
    this.file = file;
    this.requests = {};
    this.handle_response = this.handle_response.bind(this);
    this.handle_ping = this.handle_ping.bind(this);
    this.notifyChangedCallback = null;
  }

  handle_response({ msgid, rows }) {
    const [resolve, reject] = this.requests[msgid];
    resolve(rows);
    delete this.requests[msgid];
  }

  handle_ping() {}

  handle_notify({ msgid }) {
    const [resolve, reject] = this.requests[msgid];
    resolve();
    delete this.requests[msgid];
  }

  async ensureSubprocess() {
    if (!this.subprocess) {
      this.subprocess = fork(global['API_PACKAGE'] || process.argv[1], [
        '--start-process',
        'jslDatastoreProcess',
        ...process.argv.slice(3),
      ]);

      this.subprocess.on('message', message => {
        // @ts-ignore
        const { msgtype } = message;
        if (handleProcessCommunication(message, this.subprocess)) return;

        // if (this.disconnected) return;
        this[`handle_${msgtype}`](message);
      });
      this.subprocess.on('exit', () => {
        // if (this.disconnected) return;
        this.subprocess = null;
      });
      this.subprocess.send({ msgtype: 'open', file: this.file });
    }
    return this.subprocess;
  }

  async getRows(offset, limit) {
    await this.ensureSubprocess();
    const msgid = uuidv1();
    const promise = new Promise((resolve, reject) => {
      this.requests[msgid] = [resolve, reject];
      this.subprocess.send({ msgtype: 'read', msgid, offset, limit });
    });
    return promise;
  }

  async notifyChangedCore() {
    const msgid = uuidv1();
    const promise = new Promise((resolve, reject) => {
      this.requests[msgid] = [resolve, reject];
      this.subprocess.send({ msgtype: 'notify', msgid });
    });
    return promise;
  }

  async notifyChanged(callback) {
    this.notifyChangedCallback = callback;
    await this.notifyChangedCore();
    const call = this.notifyChangedCallback;
    this.notifyChangedCallback = null;
    if (call) call();
  }
}

module.exports = DatastoreProxy;
