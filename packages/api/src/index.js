const shell = require('./shell');
const processArgs = require('./utility/processArgs');
const dbgateTools = require('dbgate-tools');

global['DBGATE_TOOLS'] = dbgateTools;

if (processArgs.startProcess) {
  const proc = require('./proc');
  const module = proc[processArgs.startProcess];
  module.start();
} 

if (processArgs.startApi) {
  const main = require('./main');
  main.start();
}

module.exports = {
  ...shell,
  getMainModule: () => require('./main'),
};
