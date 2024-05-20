const _ = require('lodash');
const stableStringify = require('json-stable-stringify');

const sseResponses = {};
let electronSender = null;
let pingConfigured = false;

module.exports = {
  ensurePing() {
    if (!pingConfigured) {
      setInterval(() => this.emit('ping'), 29 * 1000);
      pingConfigured = true;
    }
  },
  addSseResponse(value, strmid) {
    sseResponses[strmid] = {
      response: value,
      filter: {},
    };
    this.ensurePing();
  },
  removeSseResponse(strmid) {
    delete sseResponses[strmid];
  },
  setElectronSender(value) {
    electronSender = value;
    this.ensurePing();
  },
  emit(message, data) {
    if (electronSender) {
      electronSender.send(message, data == null ? null : data);
    }
    for (const strmid in sseResponses) {
      let skipThisStream = false;
      for (const key in sseResponses[strmid].filter) {
        if (data && data[key]) {
          if (!sseResponses[strmid].filter[key].includes(data[key])) {
            skipThisStream = true;
            break;
          }
        }
      }
      if (skipThisStream) {
        continue;
      }

      sseResponses[strmid].response.write(
        `event: ${message}\ndata: ${stableStringify(data == null ? null : data)}\n\n`
      );
    }
  },
  emitChanged(key, params = undefined) {
    // console.log('EMIT CHANGED', key);
    this.emit('changed-cache', { key, ...params });
    // this.emit(key);
  },
  setStreamIdFilter(strmid, filter) {
    sseResponses[strmid].filter = filter;
  },
};
