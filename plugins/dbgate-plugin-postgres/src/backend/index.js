const drivers = require('./drivers');

module.exports = {
  packageName: 'dbgate-plugin-postgres',
  drivers,
  initialize(dbgateEnv) {
    drivers.initialize(dbgateEnv);
  },
};
