const driver = require('./driver');
const {
  formatProfilerEntry,
  extractProfileTimestamp,
  aggregateProfileChartEntry,
} = require('../frontend/profilerFunctions');

module.exports = {
  packageName: 'dbgate-plugin-mongo',
  drivers: [driver],
  functions: {
    formatProfilerEntry,
    extractProfileTimestamp,
    aggregateProfileChartEntry,
  },
};
