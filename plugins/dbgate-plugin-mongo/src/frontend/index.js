import driver from './driver';
import formatProfilerEntry from './formatProfilerEntry';

export default {
  packageName: 'dbgate-plugin-mongo',
  drivers: [driver],
  functions: {
    formatProfilerEntry,
  },
};
