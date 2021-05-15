const driver = require('./driver');

module.exports = {
  packageName: 'dbgate-plugin-sqlite',
  drivers: [driver],
  initialize(dbgateEnv) {
    driver.initialize(dbgateEnv);
  },
};
