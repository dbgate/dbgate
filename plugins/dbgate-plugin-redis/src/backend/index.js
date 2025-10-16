const driver = require('./driver');

module.exports = {
  packageName: 'dbgate-plugin-redis',
  drivers: [driver],
  initialize(dbgateEnv) {
    driver.initialize(dbgateEnv);
  },
};
