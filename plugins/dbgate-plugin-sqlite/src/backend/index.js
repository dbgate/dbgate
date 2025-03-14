const drivers = require('./drivers');

module.exports = {
  packageName: 'dbgate-plugin-sqlite',
  drivers: drivers,
  initialize(dbgateEnv) {
    drivers.initialize(dbgateEnv);
  },
};
