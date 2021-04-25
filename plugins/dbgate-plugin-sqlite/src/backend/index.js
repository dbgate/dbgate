const driver = require('./driver');

module.exports = {
  packageName: 'dbgate-plugin-sqlite',
  driver,
  initialize(dbgateEnv) {
    driver.initialize(dbgateEnv);
  },
};
