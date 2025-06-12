const driver = require('./driver');

module.exports = {
  packageName: 'dbgate-plugin-firebird',
  drivers: [driver],
  initialize(dbgateEnv) {},
};
