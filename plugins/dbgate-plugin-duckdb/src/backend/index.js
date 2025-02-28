const drivers = require('./drivers');

module.exports = {
  packageName: 'dbgate-plugin-duckdb',
  drivers,
  initialize(dbgateEnv) {
    drivers.initialize(dbgateEnv);
  },
};
