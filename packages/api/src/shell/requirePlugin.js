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
    console.log('Loading module', packageName);
    const module = require(path.join(pluginsdir(), packageName, 'lib', 'backend.js'));
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
