const _ = require('lodash');
const stableStringify = require('json-stable-stringify');

// The /stream endpoint (server-sent events) is reachable without authentication, so what is
// written to a stream must not depend on who connects to it. Events are therefore either harmless
// notifications (cache changes, pings), or they go to one stream only:
//   - events about a session, a runner, ... go to the stream of the browser tab that started it
//     (its strmid is sent with every API call, see getStrmidFromRequest and emitOwned);
//   - application log records go only to streams subscribed by an authorized API call
//     (subscribeTopic).
const sseResponses = {};
let electronSender = null;
let pingConfigured = false;

// owner key ('session:<sesid>', 'runner:<runid>', ...) -> strmid of the browser tab that owns it
const owners = new Map();
const MAX_OWNERS = 10000;

function isLiveResponse(response) {
  return !!response && !response.writableEnded && !response.destroyed;
}

function writeEvent(response, message, data) {
  response?.write(`event: ${message}\ndata: ${stableStringify(data == null ? null : _.omit(data, ['strmid']))}\n\n`);
}

module.exports = {
  ensurePing() {
    if (!pingConfigured) {
      // unref - the ping alone must not keep the process alive
      setInterval(() => this.emit('ping'), 29 * 1000).unref?.();
      pingConfigured = true;
    }
  },

  // Whether a stream with this id is connected right now. A second connection with the id of a
  // live stream is refused - it would otherwise take over that stream and receive its events.
  hasLiveSseResponse(strmid) {
    return isLiveResponse(sseResponses[strmid]?.response);
  },
  addSseResponse(value, strmid) {
    sseResponses[strmid] = {
      ...sseResponses[strmid],
      response: value,
    };
    this.ensurePing();
  },
  // Topic subscriptions are kept, so that they still apply after the browser reconnects with the
  // same id (the filter is set again by the client's next ping, as before).
  removeSseResponse(strmid, response = undefined) {
    const entry = sseResponses[strmid];
    if (!entry) return;
    if (response && entry.response !== response) return;
    if (entry.topics?.size) {
      delete entry.response;
      delete entry.filter;
    } else {
      delete sseResponses[strmid];
    }
  },
  setElectronSender(value) {
    electronSender = value;
    this.ensurePing();
  },
  // targetStrmid (or data.strmid) limits the event to one stream
  emit(message, data, targetStrmid = undefined) {
    if (electronSender) {
      electronSender.send(message, data == null ? null : data);
    }
    const target = targetStrmid ?? data?.strmid;
    for (const strmid in sseResponses) {
      if (target && target != strmid) {
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
        continue;
      }

      writeEvent(sseResponses[strmid].response, message, data);
    }
  },
  emitChanged(key, params = undefined) {
    // console.log('EMIT CHANGED', key);
    this.emit('changed-cache', { key, ...params });
    // this.emit(key);
  },
  setStreamIdFilter(strmid, filter) {
    sseResponses[strmid] = {
      ...sseResponses[strmid],
      filter,
    };
  },

  // The stream id the web client sends with its API calls (utility/api.ts), so that events caused
  // by the call can be sent back to the same browser tab only.
  getStrmidFromRequest(req) {
    const value = req?.headers?.['x-dbgate-strmid'];
    return typeof value == 'string' && value.length > 0 && value.length <= 100 ? value : undefined;
  },
  sessionOwnerKey(sesid) {
    return `session:${sesid}`;
  },
  runnerOwnerKey(runid) {
    return `runner:${runid}`;
  },
  setOwner(key, strmid) {
    if (!strmid) return;
    owners.delete(key);
    owners.set(key, strmid);
    if (owners.size > MAX_OWNERS) {
      owners.delete(owners.keys().next().value);
    }
  },
  // for ids chosen by the client - the first tab to use the id keeps its events
  claimOwner(key, strmid) {
    if (!owners.has(key)) {
      this.setOwner(key, strmid);
    }
  },
  getOwner(key) {
    return owners.get(key);
  },
  removeOwner(key) {
    owners.delete(key);
  },
  // Emits an event about the object identified by the owner key to the stream that owns it. An
  // object without a known owner (started by a call without a valid stream id header) has nobody
  // listening on a stream, so its events go only to the desktop app - never to every stream.
  emitOwned(key, message, data = undefined) {
    const owner = owners.get(key);
    if (!owner) {
      if (electronSender) {
        electronSender.send(message, data == null ? null : data);
      }
      return;
    }
    this.emit(message, data, owner);
  },

  subscribeTopic(strmid, topic) {
    if (!strmid) return;
    sseResponses[strmid] = {
      ...sseResponses[strmid],
    };
    sseResponses[strmid].topics = new Set([...(sseResponses[strmid].topics ?? []), topic]);
  },
  unsubscribeTopic(strmid, topic) {
    sseResponses[strmid]?.topics?.delete(topic);
  },
  // Emits only to the desktop app and to streams that subscribed to the topic
  emitToTopic(topic, message, data) {
    if (electronSender) {
      electronSender.send(message, data == null ? null : data);
    }
    for (const strmid in sseResponses) {
      if (sseResponses[strmid].topics?.has(topic)) {
        writeEvent(sseResponses[strmid].response, message, data);
      }
    }
  },
};
