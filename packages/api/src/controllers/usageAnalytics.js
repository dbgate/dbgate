const axios = require('axios');

const ENDPOINT = 'https://analytics.dbgate.cloud/v1/events';
const DEV_ENDPOINT = 'https://analytics.dbgate.cloud/dev/v1/events';
const MAX_BATCH_BYTES = 60_000;
const STRING_FIELDS = {
  feature: 80,
  action: 160,
  tab: 80,
  engine: 80,
  result: 40,
  appType: 20,
  version: 80,
  platform: 20,
  edition: 20,
  language: 30,
  installationId: 64,
};
const NUMBER_FIELDS = ['durationMs', 'value', 'activeDaysTotal', 'daysSinceInstall'];
let windowStarted = 0;
let batchesInWindow = 0;
let inFlight = 0;

function validateBatch(params) {
  if (!Array.isArray(params?.events) || params.events.length < 1 || params.events.length > 50) return null;
  const events = [];
  for (const event of params.events) {
    if (!event || typeof event !== 'object' || Array.isArray(event)) return null;
    const clean = {};
    for (const field of ['feature', 'action', 'tab']) {
      if (typeof event[field] !== 'string' || !event[field]) return null;
    }
    for (const [field, maxLength] of Object.entries(STRING_FIELDS)) {
      if (event[field] === undefined) continue;
      if (typeof event[field] !== 'string' || event[field].length > maxLength) return null;
      // Only analytics identifiers; no free-form SQL, prompts or connection details.
      if (!/^[a-zA-Z0-9_.:+@/-]+$/.test(event[field])) return null;
      clean[field] = event[field];
    }
    for (const field of NUMBER_FIELDS) {
      if (event[field] === undefined) continue;
      if (!Number.isFinite(event[field]) || event[field] < 0 || event[field] > Number.MAX_SAFE_INTEGER) return null;
      clean[field] = event[field];
    }
    events.push(clean);
  }
  const body = JSON.stringify({ events });
  return Buffer.byteLength(body, 'utf8') <= MAX_BATCH_BYTES ? body : null;
}

module.exports = {
  events_meta: true,
  async events(params) {
    // Runtime configuration only: never return the key or upstream errors to clients.
    const isDevMode = process.env.DEVMODE === '1';
    const key = process.env.ANALYTICS_API_KEY;
    if (!isDevMode && (!key || /[\r\n]/.test(key))) return { accepted: false, reason: 'not_configured' };
    const body = validateBatch(params);
    if (!body) return { accepted: false, reason: 'invalid_batch' };

    const now = Date.now();
    if (now - windowStarted >= 60_000) {
      windowStarted = now;
      batchesInWindow = 0;
    }
    // Bound both request volume and simultaneous upstream work per backend process.
    if (batchesInWindow >= 120 || inFlight >= 4) return { accepted: false, reason: 'rate_limited' };
    batchesInWindow++;
    inFlight++;
    try {
      await axios.post(isDevMode ? DEV_ENDPOINT : ENDPOINT, body, {
        headers: {
          'Content-Type': 'application/json',
          ...(!isDevMode ? { Authorization: `Bearer ${key}` } : {}),
        },
        timeout: 5000,
        maxRedirects: 0,
        maxBodyLength: MAX_BATCH_BYTES,
        maxContentLength: 4096,
      });
      return { accepted: true };
    } catch {
      // Best effort: do not log Axios errors (they contain the authorization header).
      return { accepted: false, reason: 'upstream_unavailable' };
    } finally {
      inFlight--;
    }
  },
};
