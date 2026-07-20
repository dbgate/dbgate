const crypto = require('crypto');
const getExpressPath = require('./getExpressPath');

const MCP_ROLE_ID = -4;
const MCP_AUTH_MODES = ['token', 'oauth', 'none'];

function isLocalHostname(hostname) {
  return ['localhost', '127.0.0.1', '::1'].includes(hostname.toLowerCase());
}

function hashMcpToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function isEnabledValue(value) {
  return [true, 1, '1', 'true'].includes(value);
}

function sanitizeMcpConfig(config) {
  const authMode = MCP_AUTH_MODES.includes(config?.authMode) ? config.authMode : 'none';
  return {
    enabled: isEnabledValue(config?.enabled),
    authMode,
    tokenHash: config?.tokenHash || null,
    tokenEncrypted: config?.tokenEncrypted || null,
    tokenSuffix: config?.tokenSuffix || null,
    tokenGeneratedAt: config?.tokenGeneratedAt || null,
    oauthClientId: config?.oauthClientId || null,
    oauthClientSecretHash: config?.oauthClientSecretHash || null,
    oauthClientSecretEncrypted: config?.oauthClientSecretEncrypted || null,
    oauthClientSecretSuffix: config?.oauthClientSecretSuffix || null,
    oauthClientGeneratedAt: config?.oauthClientGeneratedAt || null,
  };
}

async function readMcpConfig() {
  if (process.env.STORAGE_DATABASE) {
    const storage = require('../controllers/storage');
    return sanitizeMcpConfig((await storage.readConfig({ group: 'mcp' })) || {});
  }

  const token = process.env.MCP_TOKEN?.trim();
  return {
    enabled: !!token,
    authMode: 'token',
    tokenHash: token ? hashMcpToken(token) : null,
    tokenEncrypted: null,
    tokenSuffix: token ? token.slice(-6) : null,
    tokenGeneratedAt: null,
    oauthClientId: null,
    oauthClientSecretHash: null,
    oauthClientSecretEncrypted: null,
    oauthClientSecretSuffix: null,
    oauthClientGeneratedAt: null,
  };
}

function getPublicBaseUrl(req) {
  const configuredUrl = process.env.MCP_PUBLIC_URL?.trim();
  if (configuredUrl) {
    let parsed;
    try {
      parsed = new URL(configuredUrl);
    } catch (error) {
      throw new Error('DBGM-00000 MCP_PUBLIC_URL must be a valid HTTP(S) origin');
    }
    if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== '/' ||
      parsed.search ||
      parsed.hash
    ) {
      throw new Error(
        'DBGM-00000 MCP_PUBLIC_URL must be an HTTP(S) origin without a path, credentials, query, or fragment'
      );
    }
    if (parsed.protocol !== 'https:' && !isLocalHostname(parsed.hostname)) {
      throw new Error('DBGM-00000 MCP_PUBLIC_URL must use HTTPS for a non-local origin');
    }
    return parsed.origin;
  }

  const protocol = req?.protocol || (req?.socket?.encrypted ? 'https' : 'http');
  const host = req?.headers?.host || `localhost:${process.env.PORT || 3000}`;
  if (!['http', 'https'].includes(protocol)) {
    throw new Error('DBGM-00000 Could not determine a valid MCP public protocol');
  }
  let requestUrl;
  try {
    requestUrl = new URL(`${protocol}://${host}`);
  } catch (error) {
    throw new Error('DBGM-00000 Could not determine a valid MCP public URL');
  }
  if (requestUrl.username || requestUrl.password || requestUrl.pathname !== '/' || requestUrl.search || requestUrl.hash) {
    throw new Error('DBGM-00000 Could not determine a valid MCP public URL');
  }
  if (requestUrl.protocol !== 'https:' && !isLocalHostname(requestUrl.hostname)) {
    throw new Error('DBGM-00000 MCP OAuth requires HTTPS for a non-local public URL');
  }
  return requestUrl.origin;
}

function getMcpResourceUrl(req) {
  return `${getPublicBaseUrl(req)}${getExpressPath('/mcp')}`;
}

function setMcpIdentity(req, details = {}) {
  req.user = {
    ...details,
    amoid: 'mcp',
    roleId: MCP_ROLE_ID,
    licenseUid: details.licenseUid || 'mcp',
    login: details.login || 'mcp',
    tokenUse: 'mcp',
  };
}

function safeTokenHashEquals(token, expectedHash) {
  if (!token || !expectedHash) return false;
  const actual = Buffer.from(hashMcpToken(token), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

module.exports = {
  MCP_ROLE_ID,
  MCP_AUTH_MODES,
  hashMcpToken,
  readMcpConfig,
  sanitizeMcpConfig,
  getPublicBaseUrl,
  getMcpResourceUrl,
  setMcpIdentity,
  safeTokenHashEquals,
};
