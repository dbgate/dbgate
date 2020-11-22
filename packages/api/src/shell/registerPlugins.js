const requirePlugin = require('./requirePlugin');

function registerPlugins(...plugins) {
  for (const plugin of plugins) {
    requirePlugin(plugin.packageName, plugin);
  }
}

module.exports = registerPlugins;
