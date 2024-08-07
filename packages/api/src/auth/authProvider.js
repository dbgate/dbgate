const { getTokenSecret, getTokenLifetime } = require('./authCommon');
const _ = require('lodash');
const axios = require('axios');
const { getLogger } = require('dbgate-tools');

const AD = require('activedirectory2').promiseWrapper;
const jwt = require('jsonwebtoken');

const logger = getLogger('authProvider');

class AuthProviderBase {
  amoid = 'none';

  async login(login, password, options = undefined) {
    return {};
  }

  shouldAuthorizeApi() {
    return false;
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

  isLoginForm() {
    return false;
  }

  getAdditionalConfigProps() {
    return {};
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
    };
  }
}

class OAuthProvider extends AuthProviderBase {
  amoid = 'oauth';

  shouldAuthorizeApi() {
    return true;
  }

  async oauthToken(params) {
    const { redirectUri, code } = params;

    const scopeParam = process.env.OAUTH_SCOPE ? `&scope=${process.env.OAUTH_SCOPE}` : '';
    const resp = await axios.default.post(
      `${process.env.OAUTH_TOKEN}`,
      `grant_type=authorization_code&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&client_id=${process.env.OAUTH_CLIENT_ID}&client_secret=${process.env.OAUTH_CLIENT_SECRET}${scopeParam}`
    );

    const { access_token, refresh_token } = resp.data;

    const payload = jwt.decode(access_token);

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

  getAdditionalConfigProps() {
    return {
      oauth: process.env.OAUTH_AUTH,
      oauthClient: process.env.OAUTH_CLIENT_ID,
      oauthScope: process.env.OAUTH_SCOPE,
      oauthLogout: process.env.OAUTH_LOGOUT,
    };
  }
}

class ADProvider extends AuthProviderBase {
  amoid = 'ad';

  async login(login, password) {
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
        accessToken: jwt.sign({ login }, getTokenSecret(), { expiresIn: getTokenLifetime() }),
      };
    } catch (e) {
      return { error: 'Login failed' };
    }
  }

  shouldAuthorizeApi() {
    return !process.env.BASIC_AUTH;
  }

  isLoginForm() {
    return !process.env.BASIC_AUTH;
  }
}

class LoginsProvider extends AuthProviderBase {
  amoid = 'logins';

  async login(login, password) {
    if (password == process.env[`LOGIN_PASSWORD_${login}`]) {
      return {
        accessToken: jwt.sign({ login }, getTokenSecret(), { expiresIn: getTokenLifetime() }),
      };
    }
    return { error: 'Invalid credentials' };
  }

  shouldAuthorizeApi() {
    return !process.env.BASIC_AUTH;
  }

  isLoginForm() {
    return !process.env.BASIC_AUTH;
  }
}

class DenyAllProvider extends AuthProviderBase {
  amoid = 'deny';

  shouldAuthorizeApi() {
    return true;
  }

  async login(login, password) {
    return { error: 'Login not allowed' };
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

function detectEnvAuthProvider() {
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
