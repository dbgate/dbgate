const driver = require('./driver');

module.exports = {
  packageName: 'dbgate-plugin-mssql',
  drivers: [driver],
  initialize(dbgateEnv) {
    driver.initialize(dbgateEnv);
  },
};
