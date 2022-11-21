const drivers = require('./drivers');

module.exports = {
  packageName: 'dbgate-plugin-oracle',
  drivers,
  initialize(dbgateEnv) {
    drivers.initialize(dbgateEnv);
  },
};
