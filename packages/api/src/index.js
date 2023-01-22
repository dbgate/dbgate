const { setLogger, getLogger } = require('dbgate-tools');
const processArgs = require('./utility/processArgs');
const pino = require('pino');
const pinoms = require('pino-multi-stream');
const fs = require('fs');
const moment = require('moment');
const path = require('path');
const { logsdir } = require('./utility/directories');

if (processArgs.listenApi) {
  // configure logger

  var logger = pinoms({
    streams: [
      { stream: process.stdout }, // an "info" level destination stream
      { stream: fs.createWriteStream(path.join(logsdir(), `${moment().format('YYYY-MM-DD-HH-mm')}-${process.pid}.ndjson`)) },
    ],
  });

  setLogger(logger);
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
