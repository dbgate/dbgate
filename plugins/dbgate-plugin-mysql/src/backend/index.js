const drivers = require('./drivers');

module.exports = {
  packageName: 'dbgate-plugin-mysql',
  drivers,
  initialize(dbgateEnv) {
    drivers.initialize(dbgateEnv);
  },
};
