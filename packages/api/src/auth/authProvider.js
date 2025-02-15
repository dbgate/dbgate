const { getTokenSecret, getTokenLifetime } = require('./authCommon');
const _ = require('lodash');
const axios = require('axios');
const { getLogger, getPredefinedPermissions } = require('dbgate-tools');

const AD = require('activedirectory2').promiseWrapper;
const jwt = require('jsonwebtoken');

const logger = getLogger('authProvider');

class AuthProviderBase {
  amoid = 'none';

  async login(login, password, options = undefined) {
    return {
      accessToken: jwt.sign(
        {
          amoid: this.amoid,
        },
        getTokenSecret(),
        { expiresIn: getTokenLifetime() }
      ),
    };
  }

  oauthToken(params) {
    return {};
  }

  getCurrentLogin(req) {
    const login = req?.user?.login ?? req?.auth?.user ?? null;
    return login;
  }

  isUserLoggedIn(req) {
    return !!req?.user || !!req?.auth;
  }

  getCurrentPermissions(req) {
    const login = this.getCurrentLogin(req);
    const permissions = process.env[`LOGIN_PERMISSIONS_${login}`];
    return permissions || process.env.PERMISSIONS;
  }

  getLoginPageConnections() {
    return null;
  }

  getSingleConnectionId(req) {
    return null;
  }

  toJson() {
    return {
      amoid: this.amoid,
      workflowType: 'anonymous',
      name: 'Anonymous',
    };
  }

  async redirect({ state }) {
    return {
      status: 'error',
    };
  }

  async getLogoutUrl() {
    return null;
  }
}

class OAuthProvider extends AuthProviderBase {
  amoid = 'oauth';

  async oauthToken(params) {
    const { redirectUri, code } = params;

    const scopeParam = process.env.OAUTH_SCOPE ? `&scope=${process.env.OAUTH_SCOPE}` : '';
    const resp = await axios.default.post(
      `${process.env.OAUTH_TOKEN}`,
      `grant_type=authorization_code&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&client_id=${process.env.OAUTH_CLIENT_ID}&client_secret=${process.env.OAUTH_CLIENT_SECRET}${scopeParam}`
    );

    const { access_token, refresh_token, id_token } = resp.data;

    let payload = jwt.decode(access_token);

    // Fallback to id_token in case the access_token is not a JWT
    // https://www.oauth.com/oauth2-servers/access-tokens/
    // https://github.com/dbgate/dbgate/issues/727
    if (!payload && id_token) {
      payload = jwt.decode(id_token);
    }

    logger.info({ payload }, 'User payload returned from OAUTH');

    const login =
      process.env.OAUTH_LOGIN_FIELD && payload && payload[process.env.OAUTH_LOGIN_FIELD]
        ? payload[process.env.OAUTH_LOGIN_FIELD]
        : 'oauth';

    if (
      process.env.OAUTH_ALLOWED_LOGINS &&
      !process.env.OAUTH_ALLOWED_LOGINS.split(',').find(x => x.toLowerCase().trim() == login.toLowerCase().trim())
    ) {
      return { error: `Username ${login} not allowed to log in` };
    }

    const groups =
      process.env.OAUTH_GROUP_FIELD && payload && payload[process.env.OAUTH_GROUP_FIELD]
        ? payload[process.env.OAUTH_GROUP_FIELD]
        : [];

    const allowedGroups = process.env.OAUTH_ALLOWED_GROUPS
      ? process.env.OAUTH_ALLOWED_GROUPS.split(',').map(group => group.toLowerCase().trim())
      : [];

    if (process.env.OAUTH_ALLOWED_GROUPS && !groups.some(group => allowedGroups.includes(group.toLowerCase().trim()))) {
      return { error: `Username ${login} does not belong to an allowed group` };
    }

    if (access_token) {
      return {
        accessToken: jwt.sign({ login }, getTokenSecret(), { expiresIn: getTokenLifetime() }),
      };
    }

    return { error: 'Token not found' };
  }

  async getLogoutUrl() {
    return process.env.OAUTH_LOGOUT;
  }

  toJson() {
    return {
      ...super.toJson(),
      workflowType: 'redirect',
      name: 'OAuth 2.0',
    };
  }

  redirect({ state, redirectUri }) {
    const scopeParam = process.env.OAUTH_SCOPE ? `&scope=${process.env.OAUTH_SCOPE}` : '';
    return {
      status: 'ok',
      uri: `${process.env.OAUTH_AUTH}?client_id=${
        process.env.OAUTH_CLIENT_ID
      }&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(
        state
      )}${scopeParam}`,
    };
  }
}

class ADProvider extends AuthProviderBase {
  amoid = 'ad';

  async login(login, password, options = undefined) {
    const adConfig = {
      url: process.env.AD_URL,
      baseDN: process.env.AD_BASEDN,
      username: process.env.AD_USERNAME,
      password: process.env.AD_PASSWORD,
    };
    const ad = new AD(adConfig);
    try {
      const res = await ad.authenticate(login, password);
      if (!res) {
        return { error: 'Login failed' };
      }
      if (
        process.env.AD_ALLOWED_LOGINS &&
        !process.env.AD_ALLOWED_LOGINS.split(',').find(x => x.toLowerCase().trim() == login.toLowerCase().trim())
      ) {
        return { error: `Username ${login} not allowed to log in` };
      }
      return {
        accessToken: jwt.sign(
          {
            amoid: this.amoid,
            login,
          },
          getTokenSecret(),
          { expiresIn: getTokenLifetime() }
        ),
      };
    } catch (e) {
      return { error: 'Login failed' };
    }
  }

  toJson() {
    return {
      ...super.toJson(),
      workflowType: 'credentials',
      name: 'Active Directory',
    };
  }
}

class LoginsProvider extends AuthProviderBase {
  amoid = 'logins';

  async login(login, password, options = undefined) {
    if (login && password && process.env['LOGIN'] == login && process.env['PASSWORD'] == password) {
      return {
        accessToken: jwt.sign(
          {
            amoid: this.amoid,
            login,
          },
          getTokenSecret(),
          { expiresIn: getTokenLifetime() }
        ),
      };
    }

    if (password && password == process.env[`LOGIN_PASSWORD_${login}`]) {
      return {
        accessToken: jwt.sign(
          {
            amoid: this.amoid,
            login,
          },
          getTokenSecret(),
          { expiresIn: getTokenLifetime() }
        ),
      };
    }

    return { error: 'Invalid credentials' };
  }

  toJson() {
    return {
      ...super.toJson(),
      workflowType: 'credentials',
      name: 'Login & Password',
    };
  }
}

class DenyAllProvider extends AuthProviderBase {
  amoid = 'deny';

  async login(login, password, options = undefined) {
    return { error: 'Login not allowed' };
  }

  toJson() {
    return {
      ...super.toJson(),
      workflowType: 'credentials',
      name: 'Deny all',
    };
  }
}

function hasEnvLogins() {
  if (process.env.LOGIN && process.env.PASSWORD) {
    return true;
  }
  for (const key in process.env) {
    if (key.startsWith('LOGIN_PASSWORD_')) {
      return true;
    }
  }
  return false;
}

function detectEnvAuthProviderCore() {
  if (process.env.AUTH_PROVIDER) {
    return process.env.AUTH_PROVIDER;
  }
  if (process.env.STORAGE_DATABASE) {
    return 'denyall';
  }
  if (process.env.OAUTH_AUTH) {
    return 'oauth';
  }
  if (process.env.AD_URL) {
    return 'ad';
  }
  if (hasEnvLogins()) {
    return 'logins';
  }
  return 'none';
}

function detectEnvAuthProvider() {
  const authProvider = detectEnvAuthProviderCore();
  if (process.env.BASIC_AUTH && authProvider != 'logins' && authProvider != 'ad') {
    throw new Error(`BASIC_AUTH is not supported with ${authProvider} auth provider`);
  }
  return authProvider;
}

function createEnvAuthProvider() {
  const authProvider = detectEnvAuthProvider();
  switch (authProvider) {
    case 'oauth':
      return new OAuthProvider();
    case 'ad':
      return new ADProvider();
    case 'logins':
      return new LoginsProvider();
    case 'denyall':
      return new DenyAllProvider();
    default:
      return new AuthProviderBase();
  }
}

let defaultAuthProvider = createEnvAuthProvider();
let authProviders = [defaultAuthProvider];

function getAuthProviders() {
  return authProviders;
}

function getAuthProviderById(amoid) {
  return authProviders.find(x => x.amoid == amoid);
}

function getDefaultAuthProvider() {
  return defaultAuthProvider;
}

function getAuthProviderFromReq(req) {
  const authProviderId = req?.auth?.amoid || req?.user?.amoid;
  return getAuthProviderById(authProviderId) ?? getDefaultAuthProvider();
}

function setAuthProviders(value, defaultProvider = null) {
  authProviders = value;
  defaultAuthProvider = defaultProvider || value[0];
}

module.exports = {
  AuthProviderBase,
  detectEnvAuthProvider,
  getAuthProviders,
  getDefaultAuthProvider,
  setAuthProviders,
  getAuthProviderById,
  getAuthProviderFromReq,
};
