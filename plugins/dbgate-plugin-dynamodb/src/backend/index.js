const drivers = require('./drivers');

module.exports = {
  packageName: 'dbgate-plugin-dynamodb',
  drivers,
  initialize(dbgateEnv) {
    drivers.initialize(dbgateEnv);
  },
};
