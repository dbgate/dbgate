const axios = require('axios');
const jwt = require('jsonwebtoken');
const getExpressPath = require('../utility/getExpressPath');
const uuidv1 = require('uuid/v1');

const tokenSecret = uuidv1();

function shouldAuthorizeApi() {
  return !!process.env.OAUTH_AUTH;
}

function authMiddleware(req, res, next) {
  const SKIP_AUTH_PATHS = ['/config/get', '/auth/oauth-token', '/stream'];

  if (!shouldAuthorizeApi()) {
    return next();
  }
  if (SKIP_AUTH_PATHS.find(x => req.path == getExpressPath(x))) {
    return next();
  }
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.send(401, 'missing authorization header');
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, tokenSecret);
    req.user = decoded;
    return next();
  } catch (err) {
    console.log('&&&&&&&&&&&&&&&&&&&&&& IUNVALID TOKEN');
    console.log(token);
    console.log(err);
    return res.sendStatus(401).send('Invalid Token');
  }
}

module.exports = {
  oauthToken_meta: true,
  async oauthToken(params) {
    const { redirectUri, code } = params;

    const resp = await axios.default.post(
      `${process.env.OAUTH_TOKEN}`,
      `grant_type=authorization_code&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&client_id=${process.env.OAUTH_CLIENT_ID}&client_secret=${process.env.OAUTH_CLIENT_SECRET}`
    );

    const { access_token, refresh_token } = resp.data;

    const payload = jwt.decode(access_token);

    if (access_token) {
      return {
        accessToken: jwt.sign({ user: 'oauth' }, tokenSecret, { expiresIn: '1m' }),
      };
    }

    return { error: 'Token not found' };
  },

  authMiddleware,
  shouldAuthorizeApi,
};
