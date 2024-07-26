const axios = require('axios');
const jwt = require('jsonwebtoken');
const getExpressPath = require('../utility/getExpressPath');
const { getLogger } = require('dbgate-tools');
const AD = require('activedirectory2').promiseWrapper;
const crypto = require('crypto');
const { getTokenSecret, getTokenLifetime } = require('../auth/authCommon');
const { getAuthProvider } = require('../auth/authProvider');
const { create } = require('lodash');

const logger = getLogger('auth');

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

  if (!getAuthProvider().shouldAuthorizeApi()) {
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
      return next();
    }

    logger.error({ err }, 'Sending invalid token error');

    return unauthorizedResponse(req, res, 'invalid token');
  }
}

module.exports = {
  oauthToken_meta: true,
  async oauthToken(params) {
    return getAuthProvider().oauthToken(params);
  },
  login_meta: true,
  async login(params) {
    const { login, password } = params;

    return getAuthProvider().login(login, password);
  },

  authMiddleware,
};
