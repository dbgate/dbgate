const driver = require('./driver');
const sql = require('../../sql');

module.exports = {
  packageName: 'dbgate-plugin-db2',
  drivers: [driver],
  sql,
  initialize(dbgateEnv) {
    // Any initialization code if needed
  },
};
