const _ = require('lodash');

const sseResponses = [];
let electronSender = null;
let pingConfigured = false;

module.exports = {
  ensurePing() {
    if (!pingConfigured) {
      setInterval(() => this.emit('ping'), 29 * 1000);
      pingConfigured = true;
    }
  },
  addSseResponse(value) {
    sseResponses.push(value);
    this.ensurePing();
  },
  removeSseResponse(value) {
    _.remove(sseResponses, x => x == value);
  },
  setElectronSender(value) {
    electronSender = value;
    this.ensurePing();
  },
  emit(message, data) {
    if (electronSender) {
      electronSender.send(message, data == null ? null : data);
    }
    for (const res of sseResponses) {
      res.write(`event: ${message}\ndata: ${JSON.stringify(data == null ? null : data)}\n\n`);
    }
  },
  emitChanged(key) {
    // console.log('EMIT CHANGED', key);
    this.emit('changed-cache', key);
    // this.emit(key);
  },
};
