const { compilePermissions, testPermission } = require('dbgate-tools');
const _ = require('lodash');
const { getAuthProviderFromReq } = require('../auth/authProvider');

const cachedPermissions = {};

function hasPermission(tested, req) {
  if (!req) {
    // request object not available, allow all
    return true;
  }

  const permissions = getAuthProviderFromReq(req).getCurrentPermissions(req);

  if (!cachedPermissions[permissions]) {
    cachedPermissions[permissions] = compilePermissions(permissions);
  }

  return testPermission(tested, cachedPermissions[permissions]);

  // const { user } = (req && req.auth) || {};
  // const { login } = (process.env.OAUTH_PERMISSIONS && req && req.user) || {};
  // const key = user || login || '';
  // const logins = getLogins();

  // if (!userPermissions[key]) {
  //   if (logins) {
  //     const login = logins.find(x => x.login == user);
  //     userPermissions[key] = compilePermissions(login ? login.permissions : null);
  //   } else {
  //     userPermissions[key] = compilePermissions(process.env.PERMISSIONS);
  //   }
  // }
  // return testPermission(tested, userPermissions[key]);
}

// let loginsCache = null;
// let loginsLoaded = false;

// function getLogins() {
//   if (loginsLoaded) {
//     return loginsCache;
//   }

//   const res = [];
//   if (process.env.LOGIN && process.env.PASSWORD) {
//     res.push({
//       login: process.env.LOGIN,
//       password: process.env.PASSWORD,
//       permissions: process.env.PERMISSIONS,
//     });
//   }
//   if (process.env.LOGINS) {
//     const logins = _.compact(process.env.LOGINS.split(',').map(x => x.trim()));
//     for (const login of logins) {
//       const password = process.env[`LOGIN_PASSWORD_${login}`];
//       const permissions = process.env[`LOGIN_PERMISSIONS_${login}`];
//       if (password) {
//         res.push({
//           login,
//           password,
//           permissions,
//         });
//       }
//     }
//   } else if (process.env.OAUTH_PERMISSIONS) {
//     const login_permission_keys = Object.keys(process.env).filter(key => _.startsWith(key, 'LOGIN_PERMISSIONS_'));
//     for (const permissions_key of login_permission_keys) {
//       const login = permissions_key.replace('LOGIN_PERMISSIONS_', '');
//       const permissions = process.env[permissions_key];
//       userPermissions[login] = compilePermissions(permissions);
//     }
//   }

//   loginsCache = res.length > 0 ? res : null;
//   loginsLoaded = true;
//   return loginsCache;
// }

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
  connectionHasPermission,
  testConnectionPermission,
};
