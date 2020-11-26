const path = require('path');
const { pluginsdir } = require('../utility/directories');

const loadedPlugins = {};

const dbgateEnv = {
  dbgateApi: null,
};

function requirePlugin(packageName, requiredPlugin = null) {
  if (!packageName) throw new Error('Missing packageName in plugin');
  if (loadedPlugins[packageName]) return loadedPlugins[packageName];

  if (requiredPlugin == null) {
    let module;
    const modulePath = path.join(pluginsdir(), packageName, 'dist', 'backend.js');
    console.log(`Loading module ${packageName} from ${modulePath}`);
    try {
      // @ts-ignore
      module = __non_webpack_require__(modulePath);
    } catch (err) {
      console.error('Failed load webpacked module', err);
      module = require(modulePath);
    }
    requiredPlugin = module.__esModule ? module.default : module;
  }
  loadedPlugins[packageName] = requiredPlugin;
  if (requiredPlugin.initialize) requiredPlugin.initialize(dbgateEnv);

  return requiredPlugin;
}

requirePlugin.initialize = (value) => {
  dbgateEnv.dbgateApi = value;
};

module.exports = requirePlugin;
