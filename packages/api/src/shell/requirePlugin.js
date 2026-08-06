const path = require('path');
const fs = require('fs');
const { pluginsdir, packagedPluginsDir, getPluginBackendPath } = require('../utility/directories');
const platformInfo = require('../utility/platformInfo');
const authProxy = require('../utility/authProxy');
const { getLogger, assertValidPluginPackageName } = require('dbgate-tools');
const { openApiDriver, graphQlDriver, oDataDriver } = require('dbgate-rest');
//
const logger = getLogger('requirePlugin');

const loadedPlugins = Object.create(null);

const dbgateEnv = {
  dbgateApi: null,
  platformInfo,
  authProxy,
  isProApp: () => {
    const { isProApp } = require('../utility/checkLicense');
    return isProApp();
  },
};
function requirePlugin(packageName, requiredPlugin = null) {
  if (!packageName) throw new Error('Missing packageName in plugin');

  const isRestShortcut = packageName.endsWith('@rest') || packageName === 'rest';
  // requiredPlugin is only passed by trusted, internal callers (registerPlugins) - for
  // every other caller, validate before the cache lookup so a name like "__proto__" can't
  // be used to probe the cache object, and before it could otherwise reach a require().
  if (requiredPlugin == null && !isRestShortcut) {
    assertValidPluginPackageName(packageName);
  }

  if (loadedPlugins[packageName]) return loadedPlugins[packageName];

  if (requiredPlugin == null) {
    if (isRestShortcut) {
      return {
        drivers: [openApiDriver, graphQlDriver, oDataDriver],
      };
    }
    let module;
    const modulePath = getPluginBackendPath(packageName);
    logger.info(`DBGM-00062 Loading module ${packageName} from ${modulePath}`);
    try {
      // @ts-ignore
      module = __non_webpack_require__(modulePath);
    } catch (err) {
      // console.log('Failed load webpacked module', err.message);
      module = require(modulePath);
    }
    requiredPlugin = module.__esModule ? module.default : module;
  }
  loadedPlugins[packageName] = requiredPlugin;
  if (requiredPlugin.initialize) requiredPlugin.initialize(dbgateEnv);

  return requiredPlugin;
}

requirePlugin.initializeDbgateApi = value => {
  dbgateEnv.dbgateApi = value;
};

module.exports = requirePlugin;
