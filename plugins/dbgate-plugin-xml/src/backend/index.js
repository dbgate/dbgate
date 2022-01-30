const reader = require('./reader');
const writer = require('./writer');

module.exports = {
  packageName: 'dbgate-plugin-xml',
  shellApi: {
    reader,
    writer,
  },
};
