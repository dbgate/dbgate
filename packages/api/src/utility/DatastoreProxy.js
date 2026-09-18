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
    this.subprocessPromise = null;
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

  // Creating the subprocess is asynchronous, so concurrent callers must not each start their own.
  // The pending creation is shared, so that only one subprocess is created and all callers use it.
  async ensureSubprocess() {
    if (this.subprocess) return this.subprocess;
    if (!this.subprocessPromise) {
      this.subprocessPromise = this.createSubprocess();
    }
    return await this.subprocessPromise;
  }

  async createSubprocess() {
    try {
      const settings = await require('../controllers/config').getSettings();
      const subprocess = fork(
        global['API_PACKAGE'] || process.argv[1],
        [
          '--is-forked-api',
          '--start-process',
          'jslDatastoreProcess',
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

      subprocess.on('message', message => {
        // @ts-ignore
        const { msgtype } = message;
        if (handleProcessCommunication(message, subprocess)) return;

        // if (this.disconnected) return;
        this[`handle_${msgtype}`](message);
      });
      subprocess.on('exit', () => {
        // if (this.disconnected) return;
        if (this.subprocess === subprocess) this.subprocess = null;
      });
      subprocess.on('error', err => {
        logger.error(extractErrorLogData(err), 'DBGM-00167 Error in data store subprocess');
        if (this.subprocess === subprocess) this.subprocess = null;
      });
      subprocess.send({ msgtype: 'open', file: this.file });

      this.subprocess = subprocess;
      return subprocess;
    } finally {
      this.subprocessPromise = null;
    }
  }

  async getRows(offset, limit) {
    await this.ensureSubprocess();
    const msgid = crypto.randomUUID();
    const promise = new Promise((resolve, reject) => {
      this.requests[msgid] = [resolve, reject];
      try {
        this.subprocess.send({ msgtype: 'read', msgid, offset, limit });
      } catch (err) {
        logger.error(extractErrorLogData(err), 'DBGM-00168 Error getting rows');
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
        logger.error(extractErrorLogData(err), 'DBGM-00169 Error notifying subprocess');
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
