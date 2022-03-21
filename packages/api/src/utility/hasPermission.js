const { compilePermissions, testPermission } = require('dbgate-tools');
const _ = require('lodash');

const userPermissions = {};

function hasPermission(tested, req) {
  const { user } = (req && req.auth) || {};
  const key = user || '';
  const logins = getLogins();
  if (!userPermissions[key] && logins) {
    const login = logins.find(x => x.login == user);
    userPermissions[key] = compilePermissions(login ? login.permissions : null);
  }
  return testPermission(tested, userPermissions[key]);
}

let loginsCache = null;
let loginsLoaded = false;

function getLogins() {
  if (loginsLoaded) {
    return loginsCache;
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

  loginsCache = res.length > 0 ? res : null;
  loginsLoaded = true;
  return loginsCache;
}

module.exports = {
  hasPermission,
  getLogins,
};
