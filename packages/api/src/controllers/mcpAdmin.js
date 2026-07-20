const crypto = require('crypto');
const { isProApp } = require('../utility/checkLicense');
const { loadPermissionsFromRequest, hasPermission } = require('../utility/hasPermission');
const { sendToAuditLog } = require('../utility/auditlog');
const { encryptPasswordString, decryptPasswordString } = require('../utility/crypting');
const storage = require('./storage');
const {
  MCP_AUTH_MODES,
  hashMcpToken,
  sanitizeMcpConfig,
  getMcpResourceUrl,
} = require('../utility/mcpAuth');

async function requireMcpAdmin(req) {
  if (!isProApp() || !process.env.STORAGE_DATABASE) {
    throw new Error('DBGM-00000 MCP administration requires Team Premium');
  }
  const permissions = await loadPermissionsFromRequest(req);
  if (!hasPermission('admin/settings', permissions)) {
    throw new Error('DBGM-00000 Permission admin/settings not granted');
  }
}

async function readStoredConfig() {
  return sanitizeMcpConfig((await storage.readConfig({ group: 'mcp' })) || {});
}

function publicConfig(config, req) {
  let mcpUrl = null;
  let mcpUrlError = null;
  let token = null;
  let oauthClientSecret = null;
  try {
    mcpUrl = getMcpResourceUrl(req);
  } catch (error) {
    mcpUrlError = error.message;
  }
  try {
    token = decryptPasswordString(config.tokenEncrypted) || null;
  } catch (error) {
    token = null;
  }
  try {
    oauthClientSecret = decryptPasswordString(config.oauthClientSecretEncrypted) || null;
  } catch (error) {
    oauthClientSecret = null;
  }
  return {
    enabled: config.enabled,
    authMode: config.authMode,
    hasToken: !!config.tokenHash,
    token,
    tokenSuffix: config.tokenSuffix,
    tokenGeneratedAt: config.tokenGeneratedAt,
    mcpUrl,
    mcpUrlError,
    oauthClientId: config.oauthClientId,
    hasOAuthClientSecret: !!config.oauthClientSecretHash,
    oauthClientSecret,
    oauthClientSecretSuffix: config.oauthClientSecretSuffix,
    oauthClientGeneratedAt: config.oauthClientGeneratedAt,
  };
}

async function writeStoredConfig(config) {
  await storage.writeConfig({ group: 'mcp', config });
}

module.exports = {
  getConfig_meta: true,
  async getConfig(_params, req) {
    await requireMcpAdmin(req);
    return publicConfig(await readStoredConfig(), req);
  },

  updateConfig_meta: true,
  async updateConfig({ enabled, authMode }, req) {
    await requireMcpAdmin(req);
    if (typeof enabled !== 'boolean' || !MCP_AUTH_MODES.includes(authMode)) {
      throw new Error('DBGM-00000 Invalid MCP configuration');
    }

    const current = await readStoredConfig();
    const updated = { ...current, enabled, authMode };
    await writeStoredConfig(updated);
    sendToAuditLog(req, {
      category: 'admin',
      component: 'MCP',
      action: 'configuration',
      event: 'mcp.configurationChanged',
      severity: 'info',
      detail: { enabled, authMode },
      message: 'MCP configuration changed',
    });
    return publicConfig(updated, req);
  },

  generateToken_meta: true,
  async generateToken(_params, req) {
    await requireMcpAdmin(req);
    const token = `dbgate_mcp_${crypto.randomBytes(32).toString('base64url')}`;
    const tokenSuffix = token.slice(-6);
    const tokenGeneratedAt = new Date().toISOString();
    const current = await readStoredConfig();
    const updated = {
      ...current,
      tokenHash: hashMcpToken(token),
      tokenEncrypted: encryptPasswordString(token),
      tokenSuffix,
      tokenGeneratedAt,
    };
    await writeStoredConfig(updated);
    sendToAuditLog(req, {
      category: 'admin',
      component: 'MCP',
      action: 'generateToken',
      event: 'mcp.tokenGenerated',
      severity: 'info',
      message: 'MCP token generated',
    });
    return { token, tokenSuffix, tokenGeneratedAt };
  },

  generateOauthClient_meta: true,
  async generateOauthClient(_params, req) {
    await requireMcpAdmin(req);
    const clientId = `dbgate_mcp_client_${crypto.randomBytes(24).toString('base64url')}`;
    const clientSecret = `dbgate_mcp_secret_${crypto.randomBytes(32).toString('base64url')}`;
    const clientSecretSuffix = clientSecret.slice(-6);
    const clientGeneratedAt = new Date().toISOString();
    const current = await readStoredConfig();
    const updated = {
      ...current,
      oauthClientId: clientId,
      oauthClientSecretHash: hashMcpToken(clientSecret),
      oauthClientSecretEncrypted: encryptPasswordString(clientSecret),
      oauthClientSecretSuffix: clientSecretSuffix,
      oauthClientGeneratedAt: clientGeneratedAt,
    };
    await writeStoredConfig(updated);
    sendToAuditLog(req, {
      category: 'admin',
      component: 'MCP',
      action: 'generateOAuthClient',
      event: 'mcp.oauthClientGenerated',
      severity: 'info',
      message: 'MCP OAuth client credentials generated',
    });
    return {
      clientId,
      clientSecret,
      clientSecretSuffix,
      clientGeneratedAt,
    };
  },
};
