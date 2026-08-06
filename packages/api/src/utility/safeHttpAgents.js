const dns = require('dns');
const net = require('net');
const http = require('http');
const https = require('https');
const ipaddr = require('ipaddr.js');
const { getLogger, extractErrorLogData } = require('dbgate-tools');

const logger = getLogger('safeHttpAgents');

// Outbound HTTP(S) hardening for user-supplied URLs (eg. files.downloadText,
// jsldata.downloadJslData). By default only globally-routable unicast addresses
// are reachable; loopback, private, link-local, unique-local and other reserved
// ranges are blocked to prevent SSRF against internal services and cloud
// metadata endpoints. The target is validated on every socket connection, so
// redirects and DNS-rebinding are checked per hop.
//
// Configuration (all optional):
//   EXTERNAL_FETCH_ALLOWED_HOSTS         comma/space separated hostnames, IPs or
//                                        CIDR ranges that are allowed even when
//                                        they resolve to a non-public address
//                                        (eg. "intranet.example.com,10.1.0.0/16").
//   EXTERNAL_FETCH_ALLOW_PRIVATE_NETWORK set to "true"/"1" to disable the private
//                                        network protection entirely. This
//                                        re-exposes the server to SSRF and should
//                                        only be used on fully trusted networks.

const allowPrivateNetwork = process.env.EXTERNAL_FETCH_ALLOW_PRIVATE_NETWORK == 'true' || process.env.EXTERNAL_FETCH_ALLOW_PRIVATE_NETWORK == '1';

function parseAllowedHosts() {
  const hostNames = new Set();
  const ipMatchers = [];
  const raw = process.env.EXTERNAL_FETCH_ALLOWED_HOSTS;
  if (raw) {
    for (const itemRaw of raw.split(/[,\s]+/)) {
      const item = itemRaw.trim();
      if (!item) continue;
      try {
        if (item.includes('/')) {
          ipMatchers.push({ type: 'cidr', value: ipaddr.parseCIDR(item) });
          continue;
        }
        if (net.isIP(item)) {
          ipMatchers.push({ type: 'ip', value: ipaddr.parse(item) });
          continue;
        }
      } catch (err) {
        logger.warn(extractErrorLogData(err), `DBGM-00000 Ignoring invalid entry in EXTERNAL_FETCH_ALLOWED_HOSTS: ${item}`);
        continue;
      }
      hostNames.add(item.toLowerCase());
    }
  }
  return { hostNames, ipMatchers };
}

const allowedHosts = parseAllowedHosts();

if (allowPrivateNetwork) {
  logger.warn(
    'DBGM-00336 EXTERNAL_FETCH_ALLOW_PRIVATE_NETWORK is enabled - outbound fetch of user-supplied URLs is not protected against SSRF'
  );
}

function normalizeAddress(ip) {
  let addr = ipaddr.parse(ip);
  if (addr.kind() === 'ipv6' && addr.isIPv4MappedAddress()) {
    addr = addr.toIPv4Address();
  }
  return addr;
}

function isAllowedIp(ip) {
  let addr;
  try {
    addr = normalizeAddress(ip);
  } catch (err) {
    return false;
  }
  for (const matcher of allowedHosts.ipMatchers) {
    try {
      if (matcher.type === 'ip' && addr.toNormalizedString() === matcher.value.toNormalizedString()) {
        return true;
      }
      if (matcher.type === 'cidr' && addr.kind() === matcher.value[0].kind() && addr.match(matcher.value)) {
        return true;
      }
    } catch (err) {
      // kind mismatch etc. - not a match
    }
  }
  return false;
}

// An address may be connected to if it is a public unicast address, or it has
// been explicitly allow-listed by the operator.
function isAddressAllowed(ip) {
  if (allowPrivateNetwork) return true;
  if (isAllowedIp(ip)) return true;
  try {
    return normalizeAddress(ip).range() === 'unicast';
  } catch (err) {
    // Unparseable address: fail closed.
    return false;
  }
}

function isHostnameAllowlisted(host) {
  return !!host && allowedHosts.hostNames.has(host.toLowerCase());
}

function blockedError(target) {
  return new Error(`DBGM-00337 Blocked request to non-public address ${target}`);
}

// DNS lookup used for hostname targets. Validates every resolved address.
function safeLookup(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) {
      return callback(err);
    }
    const list = Array.isArray(addresses) ? addresses : [addresses];
    for (const entry of list) {
      if (!isAddressAllowed(entry.address)) {
        logger.warn(`DBGM-00337 Blocked request to non-public address ${entry.address} (${hostname})`);
        return callback(blockedError(`${entry.address} (${hostname})`));
      }
    }
    if (options && options.all) {
      return callback(null, list);
    }
    const chosen = list[0];
    return callback(null, chosen.address, chosen.family);
  });
}

// Build an agent that validates the connection target on every socket creation.
// Literal-IP targets are checked directly (Node does not invoke `lookup` for
// them); hostname targets go through safeLookup. createConnection runs for every
// redirect hop, so each hop is independently validated.
function makeSafeAgent(BaseAgent) {
  const agent = new BaseAgent({ keepAlive: false });
  const baseCreateConnection = agent.createConnection.bind(agent);
  agent.createConnection = function (options, callback) {
    const host = options.host || options.hostname;
    if (host && isHostnameAllowlisted(host)) {
      return baseCreateConnection(options, callback);
    }
    if (host && net.isIP(host) && !isAddressAllowed(host)) {
      logger.warn(`DBGM-00337 Blocked request to non-public address ${host}`);
      const err = blockedError(host);
      if (callback) {
        callback(err);
        return;
      }
      throw err;
    }
    return baseCreateConnection({ ...options, lookup: safeLookup }, callback);
  };
  return agent;
}

const safeHttpAgent = makeSafeAgent(http.Agent);
const safeHttpsAgent = makeSafeAgent(https.Agent);

module.exports = {
  safeHttpAgent,
  safeHttpsAgent,
  isAddressAllowed,
};
