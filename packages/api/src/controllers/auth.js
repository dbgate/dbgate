const axios = require('axios');
const jwt = require('jsonwebtoken');
const getExpressPath = require('../utility/getExpressPath');
const uuidv1 = require('uuid/v1');
const { getLogins } = require('../utility/hasPermission');
const { getLogger } = require('dbgate-tools');
const AD = require('activedirectory2').promiseWrapper;

const logger = getLogger('auth');

const tokenSecret = uuidv1();

function shouldAuthorizeApi() {
  const logins = getLogins();
  return !!process.env.OAUTH_AUTH || !!process.env.AD_URL || (!!logins && !process.env.BASIC_AUTH);
}

function getTokenLifetime() {
  return process.env.TOKEN_LIFETIME || '1d';
}

function unauthorizedResponse(req, res, text) {
  // if (req.path == getExpressPath('/config/get-settings')) {
  //   return res.json({});
  // }
  // if (req.path == getExpressPath('/connections/list')) {
  //   return res.json([]);
  // }
  return res.sendStatus(401).send(text);
}

function authMiddleware(req, res, next) {
  const SKIP_AUTH_PATHS = ['/config/get', '/auth/oauth-token', '/auth/login', '/stream'];

  if (!shouldAuthorizeApi()) {
    return next();
  }
  let skipAuth = !!SKIP_AUTH_PATHS.find(x => req.path == getExpressPath(x));

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    if (skipAuth) {
      return next();
    }
    return unauthorizedResponse(req, res, 'missing authorization header');
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, tokenSecret);
    req.user = decoded;
    return next();
  } catch (err) {
    if (skipAuth) {
      return next();
    }

    logger.error({ err }, 'Sending invalid token error');

    return unauthorizedResponse(req, res, 'invalid token');
  }
}

module.exports = {
  oauthToken_meta: true,
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
    if (access_token) {
      return {
        accessToken: jwt.sign({ login }, tokenSecret, { expiresIn: getTokenLifetime() }),
      };
    }

    return { error: 'Token not found' };
  },
  login_meta: true,
  async login(params) {
    const { login, password } = params;

    if (process.env.AD_URL) {
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
          accessToken: jwt.sign({ login }, tokenSecret, { expiresIn: getTokenLifetime() }),
        };
      } catch (err) {
        logger.error({ err }, 'Failed active directory authentization');
        return {
          error: err.message,
        };
      }
    }

    const logins = getLogins();
    if (!logins) {
      return { error: 'Logins not configured' };
    }
    const foundLogin = logins.find(x => x.login == login);
    if (foundLogin && foundLogin.password && foundLogin.password == password) {
      return {
        accessToken: jwt.sign({ login }, tokenSecret, { expiresIn: getTokenLifetime() }),
      };
    }
    return { error: 'Invalid credentials' };
  },

  authMiddleware,
  shouldAuthorizeApi,
};
