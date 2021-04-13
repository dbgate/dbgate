const reader = require('./reader');
const writer = require('./writer');

module.exports = {
  packageName: 'dbgate-plugin-csv',
  shellApi: {
    reader,
    writer,
  },
  initialize(dbgateEnv) {
    reader.initialize(dbgateEnv);
  },
};
