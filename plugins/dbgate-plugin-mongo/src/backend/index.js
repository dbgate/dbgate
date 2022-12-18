const driver = require('./driver');
const formatProfilerEntry = require('../frontend/formatProfilerEntry');
const formatProfilerChartEntry = require('../frontend/formatProfilerChartEntry');

module.exports = {
  packageName: 'dbgate-plugin-mongo',
  drivers: [driver],
  functions: {
    formatProfilerEntry,
    formatProfilerChartEntry,
  },
};
