const _ = require('lodash');
const formatProfilerEntry = require('./formatProfilerEntry');

function formatProfilerChartEntry(obj) {
  const fmt = formatProfilerEntry(obj);

  return {
    ts: fmt.ts,
    millis: fmt.stats.millis,
    count: 1,
  };
}

module.exports = formatProfilerChartEntry;
