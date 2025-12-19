const drivers = require('./drivers');
const {
  formatProfilerEntry,
  extractProfileTimestamp,
  aggregateProfileChartEntry,
} = require('../frontend/profilerFunctions');

module.exports = {
  packageName: 'dbgate-plugin-mongo',
  drivers,
  functions: {
    formatProfilerEntry,
    extractProfileTimestamp,
    aggregateProfileChartEntry,
  },
  initialize(dbgateEnv) {
    drivers.initialize(dbgateEnv);
  },
};
