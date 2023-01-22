const { setLogger, getLogger, setLoggerName } = require('dbgate-tools');
const processArgs = require('./utility/processArgs');
const pino = require('pino');
const pinoms = require('pino-multi-stream');
const fs = require('fs');
const moment = require('moment');
const path = require('path');
const { logsdir, setLogsFilePath } = require('./utility/directories');

if (processArgs.startProcess) {
  setLoggerName(processArgs.startProcess.replace(/Process$/, ''));
}
if (processArgs.processDisplayName) {
  setLoggerName(processArgs.processDisplayName);
}

if (processArgs.listenApi) {
  // configure logger

  const logsFilePath = path.join(logsdir(), `${moment().format('YYYY-MM-DD-HH-mm')}-${process.pid}.ndjson`);
  setLogsFilePath(logsFilePath);

  let logger = pinoms({
    streams: [
      { stream: process.stdout }, // an "info" level destination stream
      {
        stream: fs.createWriteStream(logsFilePath),
      },
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
