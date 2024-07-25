const { getTokenSecret, getTokenLifetime } = require('./authCommon');
const _ = require('lodash');
const axios = require('axios');
const { getLogger } = require('dbgate-tools');

const AD = require('activedirectory2').promiseWrapper;
const jwt = require('jsonwebtoken');

const logger = getLogger('authProvider');

let envLoginsCache = null;
let envLoginsLoaded = false;

function getEnvLogins() {
  if (envLoginsLoaded) {
    return envLoginsCache;
  }

  const res = [];
  if (process.env.LOGIN && process.env.PASSWORD) {
    res.push({
      login: process.env.LOGIN,
      password: process.env.PASSWORD,
      permissions: process.env.PERMISSIONS,
    });
  }
  if (process.env.LOGINS) {
    const logins = _.compact(process.env.LOGINS.split(',').map(x => x.trim()));
    for (const login of logins) {
      const password = process.env[`LOGIN_PASSWORD_${login}`];
      const permissions = process.env[`LOGIN_PERMISSIONS_${login}`];
      if (password) {
        res.push({
          login,
          password,
          permissions,
        });
      }
    }
  }

  envLoginsCache = res.length > 0 ? res : null;
  envLoginsLoaded = true;
  return envLoginsCache;
}

class AuthProviderBase {
  async login(login, password) {
    return {};
  }

  getBasicAuthLogins() {
    return null;
  }

  shouldAuthorizeApi() {
    return false;
  }

  oauthToken(params) {
    return {};
  }

  getCurrentLogin(req) {}

  getCurrentPermissions(req) {
    return process.env.PERMISSIONS;
  }
}

class OAuthProvider extends AuthProviderBase {
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
}

class ADProvider extends AuthProviderBase {
  async login(login, password) {
    const adConfig = {
      url: process.env.AD_URL,
      baseDN: process.env.AD_BASEDN,
      username: process.env.AD_USERNAME,
      password: process.env.AD_PASSOWRD,
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
    return true;
  }
}

class LoginsProvider extends AuthProviderBase {
  async login(login, password) {
    const logins = getEnvLogins();
    if (!logins) {
      return { error: 'Logins not configured' };
    }
    const foundLogin = logins.find(x => x.login == login);
    if (foundLogin && foundLogin.password && foundLogin.password == password) {
      return {
        accessToken: jwt.sign({ login }, getTokenSecret(), { expiresIn: getTokenLifetime() }),
      };
    }
    return { error: 'Invalid credentials' };
  }

  getBasicAuthLogins() {
    const logins = getEnvLogins();
    if (logins && process.env.BASIC_AUTH) {
      return _.fromPairs(logins.filter(x => x.password).map(x => [x.login, x.password]));
    }
  }

  shouldAuthorizeApi() {
    return !process.env.BASIC_AUTH;
  }
}

export function detectEnvAuthProvider() {
  if (process.env.AUTH_PROVIDER) {
    return process.env.AUTH_PROVIDER;
  }
  if (process.env.OAUTH_AUTH) {
    return 'oauth';
  }
  if (process.env.AD_URL) {
    return 'ad';
  }
  if (getEnvLogins()) {
    return 'logins';
  }
  return 'none';
}

export function createAuthProvider() {
  const authProvider = detectEnvAuthProvider();
  switch (authProvider) {
    case 'oauth':
      return new OAuthProvider();
    case 'ad':
      return new ADProvider();
    case 'logins':
      return new LoginsProvider();
    default:
      return new AuthProviderBase();
  }
}
