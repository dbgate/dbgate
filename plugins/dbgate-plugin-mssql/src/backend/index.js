const driver = require('./driver');

module.exports = {
  packageName: 'dbgate-plugin-mssql',
  driver,
  initialize(dbgateEnv) {
    driver.initialize(dbgateEnv);
  },
};
