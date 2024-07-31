const driver = require('./driver');

module.exports = {
  packageName: 'dbgate-plugin-oracle',
  drivers: [driver],
  initialize(dbgateEnv) {
    driver.initialize(dbgateEnv);
  },
};
