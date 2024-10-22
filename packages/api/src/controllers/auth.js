const axios = require('axios');
const jwt = require('jsonwebtoken');
const getExpressPath = require('../utility/getExpressPath');
const { getLogger, extractErrorLogData } = require('dbgate-tools');
const AD = require('activedirectory2').promiseWrapper;
const crypto = require('crypto');
const { getTokenSecret, getTokenLifetime } = require('../auth/authCommon');
const {
  getAuthProviderFromReq,
  getAuthProviders,
  getDefaultAuthProvider,
  getAuthProviderById,
} = require('../auth/authProvider');
const storage = require('./storage');

const logger = getLogger('auth');

function unauthorizedResponse(req, res, text) {
  // if (req.path == getExpressPath('/config/get-settings')) {
  //   return res.json({});
  // }
  // if (req.path == getExpressPath('/connections/list')) {
  //   return res.json([]);
  // }

  return res.status(401).send(text);
}

function authMiddleware(req, res, next) {
  const SKIP_AUTH_PATHS = [
    '/config/get',
    '/config/logout',
    '/config/get-settings',
    '/config/save-license-key',
    '/auth/oauth-token',
    '/auth/login',
    '/auth/redirect',
    '/stream',
    '/storage/get-connections-for-login-page',
    '/storage/set-admin-password',
    '/auth/get-providers',
    '/connections/dblogin-web',
    '/connections/dblogin-app',
    '/connections/dblogin-auth',
    '/connections/dblogin-auth-token',
  ];

  // console.log('********************* getAuthProvider()', getAuthProvider());

  // const isAdminPage = req.headers['x-is-admin-page'] == 'true';

  if (process.env.BASIC_AUTH) {
    // API is not authorized for basic auth
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
    const decoded = jwt.verify(token, getTokenSecret());
    req.user = decoded;
    return next();
  } catch (err) {
    if (skipAuth) {
      req.isInvalidToken = true;
      return next();
    }

    logger.error(extractErrorLogData(err), 'Sending invalid token error');

    return unauthorizedResponse(req, res, 'invalid token');
  }
}

module.exports = {
  oauthToken_meta: true,
  async oauthToken(params) {
    const { amoid } = params;
    return getAuthProviderById(amoid).oauthToken(params);
  },
  login_meta: true,
  async login(params) {
    const { amoid, login, password, isAdminPage } = params;

    if (isAdminPage) {
      let adminPassword = process.env.ADMIN_PASSWORD;
      if (!adminPassword) {
        const adminConfig = await storage.readConfig({ group: 'admin' });
        adminPassword = adminConfig?.adminPassword;
      }
      if (adminPassword && adminPassword == password) {
        return {
          accessToken: jwt.sign(
            {
              login: 'superadmin',
              permissions: await storage.loadSuperadminPermissions(),
              roleId: -3,
            },
            getTokenSecret(),
            {
              expiresIn: getTokenLifetime(),
            }
          ),
        };
      }

      return { error: 'Login failed' };
    }

    return getAuthProviderById(amoid).login(login, password);
  },

  getProviders_meta: true,
  getProviders() {
    return {
      providers: getAuthProviders().map(x => x.toJson()),
      default: getDefaultAuthProvider()?.amoid,
    };
  },

  redirect_meta: true,
  async redirect(params) {
    const { amoid } = params;
    return getAuthProviderById(amoid).redirect(params);
  },

  authMiddleware,
};
