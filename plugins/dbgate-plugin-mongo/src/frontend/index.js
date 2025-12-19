import drivers from './drivers';
import { formatProfilerEntry, extractProfileTimestamp, aggregateProfileChartEntry } from './profilerFunctions';

export default {
  packageName: 'dbgate-plugin-mongo',
  drivers,
  functions: {
    formatProfilerEntry,
    extractProfileTimestamp,
    aggregateProfileChartEntry,
  },
};
