import driver from './driver';
import formatProfilerEntry from './formatProfilerEntry';
import formatProfilerChartEntry from './formatProfilerChartEntry';

export default {
  packageName: 'dbgate-plugin-mongo',
  drivers: [driver],
  functions: {
    formatProfilerEntry,
    formatProfilerChartEntry,
  },
};
