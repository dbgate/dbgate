const axios = require('axios');

module.exports = {
  oauthToken_meta: true,
  async oauthToken(params) {
    const { redirectUri, code } = params;

    const resp = await axios.default.post(
      `${process.env.OAUTH}/token`,
      `grant_type=authorization_code&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&client_id=${process.env.OAUTH_CLIENT_ID}&client_secret=${process.env.OAUTH_CLIENT_SECRET}`
    );

    return resp.data;
  },
};
