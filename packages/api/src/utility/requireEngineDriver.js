const _ = require('lodash');
const requirePlugin = require('../shell/requirePlugin');

/** @returns {import('dbgate-types').EngineDriver} */
function requireEngineDriver(connection) {
  let engine = null;
  if (_.isString(connection)) {
    engine = connection;
  } else if (_.isPlainObject(connection)) {
    engine = connection.engine;
  }
  if (!engine) {
    throw new Error('Could not get driver from connection');
  }
  if (engine.includes('@')) {
    const [shortName, packageName] = engine.split('@');
    const plugin = requirePlugin(packageName);
    return plugin.drivers.find(x => x.engine == engine);
  }
  throw new Error(`Could not found engine driver ${engine}`);
}

module.exports = requireEngineDriver;
