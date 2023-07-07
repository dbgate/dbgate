const { compilePermissions, testPermission } = require('dbgate-tools');
const _ = require('lodash');

const userPermissions = {};

function hasPermission(tested, req) {
  if (!req) {
    // request object not available, allow all
    return true;
  }
  const key = req.user?.login ?? req.auth?.user?.login ?? '';
  const logins = getLogins();

  if (!userPermissions[key]) {
    if (logins) {
      const login = logins.find(x => x.login == key);
      userPermissions[key] = compilePermissions(login ? login.permissions : null);
    } else {
      userPermissions[key] = compilePermissions(process.env.PERMISSIONS);
    }
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

function connectionHasPermission(connection, req) {
  if (!connection) {
    return true;
  }
  if (_.isString(connection)) {
    return hasPermission(`connections/${connection}`, req);
  } else {
    return hasPermission(`connections/${connection._id}`, req);
  }
}

function testConnectionPermission(connection, req) {
  if (!connectionHasPermission(connection, req)) {
    throw new Error('Connection permission not granted');
  }
}

module.exports = {
  hasPermission,
  getLogins,
  connectionHasPermission,
  testConnectionPermission,
};
