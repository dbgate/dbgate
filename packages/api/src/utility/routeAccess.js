const _ = require('lodash');
const {
  testStandardPermission,
  testConnectionPermission,
  testDatabaseRolePermission,
  loadPermissionsFromRequest,
} = require('./hasPermission');

// Every API route declares who may call it, as `<method>_access` next to `<method>_meta` in its
// controller. A route without a valid declaration is refused in the web app (fail closed), so a
// new route cannot be exposed without someone deciding its access. The desktop app has a single
// local user and no checks.
//
// Declarations:
//   'public'      - callable without login; the path must also be in SKIP_AUTH_PATHS (auth.js)
//   'user'        - any logged-in user; the route only concerns harmless or the caller's own data
//   'self'        - the method itself performs all permission checks (keep them next to the code)
//   'electron'    - desktop app only; refused in the web app
//   {
//     permission: 'perm' | ['perm', ...],  - standard permissions, all required
//     connection: 'argName',               - permission for the connection in args[argName]
//     database: 'argName',                 - with databaseRole: role on that database
//     databaseRole: 'view' | 'read_content' | 'write_data' | 'run_script',
//     privateCloud: true,                  - the private cloud is enabled on this server
//   }
// A connection argument naming a volatile connection (credentials the user entered) passes the
// connection check: creating it required permission for the connection it is based on.

const SIMPLE_ACCESS = ['public', 'user', 'self', 'electron'];
const OBJECT_ACCESS_KEYS = ['permission', 'connection', 'database', 'databaseRole', 'privateCloud'];
const DATABASE_ROLES = ['view', 'read_content', 'write_data', 'run_script'];

class RouteAccessError extends Error {}

function validateRouteAccess(access) {
  if (SIMPLE_ACCESS.includes(access)) return true;
  if (!_.isPlainObject(access)) return false;
  const keys = Object.keys(access);
  if (keys.length == 0 || keys.some(x => !OBJECT_ACCESS_KEYS.includes(x))) return false;
  if (access.permission != null) {
    const permissions = _.castArray(access.permission);
    if (permissions.length == 0 || permissions.some(x => !_.isString(x) || !x)) return false;
  }
  if (access.connection != null && !_.isString(access.connection)) return false;
  if (access.databaseRole != null) {
    if (!DATABASE_ROLES.includes(access.databaseRole)) return false;
    if (!_.isString(access.connection) || !_.isString(access.database)) return false;
  }
  if (access.database != null && access.databaseRole == null) return false;
  if (access.privateCloud != null && access.privateCloud !== true) return false;
  return true;
}

// Throws RouteAccessError when the request may not call the route
async function checkRouteAccess(access, args, req) {
  if (!validateRouteAccess(access)) {
    throw new RouteAccessError('DBGM-00000 Route has no access policy');
  }
  if (access == 'electron') {
    throw new RouteAccessError('DBGM-00000 Route is available only in the desktop application');
  }
  if (SIMPLE_ACCESS.includes(access)) {
    return;
  }

  if (access.privateCloud && !process.env.ALLOW_DBGATE_PRIVATE_CLOUD) {
    // the private cloud works through one cloud account shared by all users of the server
    throw new RouteAccessError('DBGM-00000 Private cloud is not enabled on this server');
  }

  try {
    const loadedPermissions = await loadPermissionsFromRequest(req);
    for (const permission of _.castArray(access.permission ?? [])) {
      await testStandardPermission(permission, req, loadedPermissions);
    }
    if (access.connection) {
      const conid = args?.[access.connection];
      // without the argument, the permission check would pass in some setups - refuse instead
      if (conid == null || conid === '') {
        throw new Error(`DBGM-00000 Missing connection argument ${access.connection}`);
      }
      if (!require('../controllers/connections').isVolatileConnection(conid)) {
        await testConnectionPermission(conid, req, loadedPermissions);
      }
    }
    if (access.databaseRole) {
      await testDatabaseRolePermission(args?.[access.connection], args?.[access.database], access.databaseRole, req);
    }
  } catch (err) {
    throw new RouteAccessError(err.message);
  }
}

module.exports = {
  RouteAccessError,
  validateRouteAccess,
  checkRouteAccess,
};
