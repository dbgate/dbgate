const path = require('path');
const fs = require('fs');
const { pluginsdir, packagedPluginsDir, getPluginBackendPath } = require('../utility/directories');
const nativeModules = require('../nativeModules');
const platformInfo = require('../utility/platformInfo');
const { getLogger } = require('dbgate-tools');
const logger = getLogger();

const loadedPlugins = {};

const dbgateEnv = {
  dbgateApi: null,
  nativeModules,
};
function requirePlugin(packageName, requiredPlugin = null) {
  if (!packageName) throw new Error('Missing packageName in plugin');
  if (loadedPlugins[packageName]) return loadedPlugins[packageName];

  if (requiredPlugin == null) {
    let module;
    const modulePath = getPluginBackendPath(packageName);
    logger.info(`Loading module ${packageName} from ${modulePath}`);
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
