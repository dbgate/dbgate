const { setLogger, getLogger } = require('dbgate-tools');
const processArgs = require('./utility/processArgs');
const pino = require('pino');

if (processArgs.listenApi) {
  // configure logger
}

const shell = require('./shell');
const dbgateTools = require('dbgate-tools');

global['DBGATE_TOOLS'] = dbgateTools;

if (processArgs.startProcess) {
  const proc = require('./proc');
  const module = proc[processArgs.startProcess];
  module.start();
}

if (processArgs.listenApi) {
  const main = require('./main');
  main.start();
}

module.exports = {
  ...shell,
  getLogger,
  getMainModule: () => require('./main'),
};
