const driver = require('./driver');
const formatProfilerEntry = require('../frontend/formatProfilerEntry');

module.exports = {
  packageName: 'dbgate-plugin-mongo',
  drivers: [driver],
  functions: {
    formatProfilerEntry,
  },
};
