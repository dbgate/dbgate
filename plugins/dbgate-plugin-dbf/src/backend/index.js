const reader = require('./reader');
// const writer = require('./writer');

module.exports = {
  packageName: 'dbgate-plugin-dbf',
  shellApi: {
    reader,
  },
  initialize(dbgateEnv) {
    reader.initialize(dbgateEnv);
  },
};
