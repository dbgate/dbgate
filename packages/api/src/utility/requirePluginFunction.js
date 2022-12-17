const _ = require('lodash');
const requirePlugin = require('../shell/requirePlugin');

function requirePluginFunction(functionName) {
  if (!functionName) return null;
  if (functionName.includes('@')) {
    const [shortName, packageName] = functionName.split('@');
    const plugin = requirePlugin(packageName);
    if (plugin.functions) {
      return plugin.functions[shortName];
    }
  }
  return null;
}

module.exports = requirePluginFunction;
