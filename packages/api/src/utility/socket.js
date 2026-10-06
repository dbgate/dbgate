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
      ...sseResponses[strmid],
      response: value,
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
    const delivery = {
      electronSent: false,
      sseStreamCount: Object.keys(sseResponses).length,
      sseDeliveredCount: 0,
      sseFilteredCount: 0,
      sseUnavailableCount: 0,
    };
    if (electronSender) {
      electronSender.send(message, data == null ? null : data);
      delivery.electronSent = true;
    }
    for (const strmid in sseResponses) {
      if (data?.strmid && data?.strmid != strmid) {
        delivery.sseFilteredCount += 1;
        continue;
      }
      let skipThisStream = false;
      if (sseResponses[strmid].filter) {
        for (const key in sseResponses[strmid].filter) {
          if (data && data[key]) {
            if (!sseResponses[strmid].filter[key].includes(data[key])) {
              skipThisStream = true;
              break;
            }
          }
        }
      }
      if (skipThisStream) {
        delivery.sseFilteredCount += 1;
        continue;
      }

      if (sseResponses[strmid].response) {
        sseResponses[strmid].response.write(
          `event: ${message}\ndata: ${stableStringify(data == null ? null : _.omit(data, ['strmid']))}\n\n`
        );
        delivery.sseDeliveredCount += 1;
      } else {
        delivery.sseUnavailableCount += 1;
      }
    }
    return delivery;
  },
  emitChanged(key, params = undefined) {
    // console.log('EMIT CHANGED', key);
    return this.emit('changed-cache', { key, ...params });
    // this.emit(key);
  },
  setStreamIdFilter(strmid, filter) {
    sseResponses[strmid] = {
      ...sseResponses[strmid],
      filter,
    };
  },
};
