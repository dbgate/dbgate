import driver from './driver';
import { formatProfilerEntry, extractProfileTimestamp, aggregateProfileChartEntry } from './profilerFunctions';

export default {
  packageName: 'dbgate-plugin-mongo',
  drivers: [driver],
  functions: {
    formatProfilerEntry,
    extractProfileTimestamp,
    aggregateProfileChartEntry,
  },
};
