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
const { decryptPasswordString } = require('../utility/crypting');
const {
  createDbGateIdentitySession,
  startCloudTokenChecking,
  readCloudTokenHolder,
  readCloudTestTokenHolder,
} = require('../utility/cloudIntf');
const socket = require('../utility/socket');
const { sendToAuditLog } = require('../utility/auditlog');
const {
  isLoginLicensed,
  LOGIN_LIMIT_ERROR,
  markTokenAsLoggedIn,
  markUserAsActive,
  markLoginAsLoggedOut,
} = require('../utility/loginchecker');

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
    '/health',
    '/__health',
  ];

  // console.log('********************* getAuthProvider()', getAuthProvider());

  // const isAdminPage = req.headers['x-is-admin-page'] == 'true';

  if (process.env.SKIP_ALL_AUTH) {
    // API is not authorized for basic auth
    return next();
  }

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
    markUserAsActive(decoded.licenseUid, token);

    return next();
  } catch (err) {
    if (skipAuth) {
      req.isInvalidToken = true;
      return next();
    }

    logger.error(extractErrorLogData(err), 'DBGM-00098 Sending invalid token error');

    return unauthorizedResponse(req, res, 'invalid token');
  }
}

module.exports = {
  oauthToken_meta: true,
  async oauthToken(params, req) {
    const { amoid } = params;
    return getAuthProviderById(amoid).oauthToken(params, req);
  },
  login_meta: true,
  async login(params, req) {
    const { amoid, login, password, isAdminPage } = params;

    if (isAdminPage) {
      let adminPassword = process.env.ADMIN_PASSWORD;
      if (!adminPassword) {
        const adminConfig = await storage.readConfig({ group: 'admin' });
        adminPassword = decryptPasswordString(adminConfig?.adminPassword);
      }
      if (adminPassword && adminPassword == password) {
        if (!(await isLoginLicensed(req, `superadmin`))) {
          return { error: LOGIN_LIMIT_ERROR };
        }

        sendToAuditLog(req, {
          category: 'auth',
          component: 'AuthController',
          action: 'login',
          event: 'login.admin',
          severity: 'info',
          message: 'Administration login successful',
        });

        const licenseUid = `superadmin`;
        const accessToken = jwt.sign(
          {
            login: 'superadmin',
            permissions: await storage.loadSuperadminPermissions(),
            roleId: -3,
            licenseUid,
          },
          getTokenSecret(),
          {
            expiresIn: getTokenLifetime(),
          }
        );
        markTokenAsLoggedIn(licenseUid, accessToken);

        return {
          accessToken,
        };
      }

      sendToAuditLog(req, {
        category: 'auth',
        component: 'AuthController',
        action: 'loginFail',
        event: 'login.adminFailed',
        severity: 'warn',
        message: 'Administraton login failed',
      });

      return { error: 'Login failed' };
    }

    return getAuthProviderById(amoid).login(login, password, undefined, req);
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

  createCloudLoginSession_meta: true,
  async createCloudLoginSession({ client, redirectUri }) {
    const res = await createDbGateIdentitySession(client, redirectUri);
    startCloudTokenChecking(res.sid, tokenHolder => {
      socket.emit('got-cloud-token', tokenHolder);
      socket.emitChanged('cloud-content-changed');
      socket.emit('cloud-content-updated');
    });
    return res;
  },

  cloudLoginRedirected_meta: true,
  async cloudLoginRedirected({ sid }) {
    const tokenHolder = await readCloudTokenHolder(sid);
    return tokenHolder;
  },

  cloudTestLogin_meta: true,
  async cloudTestLogin({ email }) {
    const tokenHolder = await readCloudTestTokenHolder(email);
    return tokenHolder;
  },

  logoutAdmin_meta: true,
  async logoutAdmin() {
    await markLoginAsLoggedOut('superadmin');
    return true;
  },

  logoutUser_meta: true,
  async logoutUser({}, req) {
    await markLoginAsLoggedOut(req?.user?.licenseUid);
    return true;
  },

  authMiddleware,
};
