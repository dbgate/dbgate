const crypto = require('crypto');
const { fork } = require('child_process');
const { handleProcessCommunication } = require('./processComm');
const processArgs = require('../utility/processArgs');
const pipeForkLogs = require('./pipeForkLogs');
const { getLogger, extractErrorLogData } = require('dbgate-tools');
const logger = getLogger('DatastoreProxy');

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
      this.subprocess = fork(
        global['API_PACKAGE'] || process.argv[1],
        [
          '--is-forked-api',
          '--start-process',
          'jslDatastoreProcess',
          ...processArgs.getPassArgs(),
          // ...process.argv.slice(3),
        ],
        {
          stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
        }
      );
      pipeForkLogs(this.subprocess);

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
    const msgid = crypto.randomUUID();
    const promise = new Promise((resolve, reject) => {
      this.requests[msgid] = [resolve, reject];
      try {
        this.subprocess.send({ msgtype: 'read', msgid, offset, limit });
      } catch (err) {
        logger.error(extractErrorLogData(err), 'Error getting rows');
        this.subprocess = null;
      }
    });
    return promise;
  }

  async notifyChangedCore() {
    const msgid = crypto.randomUUID();
    const promise = new Promise((resolve, reject) => {
      this.requests[msgid] = [resolve, reject];
      try {
        this.subprocess.send({ msgtype: 'notify', msgid });
      } catch (err) {
        logger.error(extractErrorLogData(err), 'Error notifying subprocess');
        this.subprocess = null;
      }
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
