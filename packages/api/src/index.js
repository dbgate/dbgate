const { setLogger, getLogger, setLoggerName } = require('dbgate-tools');
const processArgs = require('./utility/processArgs');
const pino = require('pino');
const pinoms = require('pino-multi-stream');
const fs = require('fs');
const moment = require('moment');
const path = require('path');
const { logsdir, setLogsFilePath, getLogsFilePath } = require('./utility/directories');

if (processArgs.startProcess) {
  setLoggerName(processArgs.startProcess.replace(/Process$/, ''));
}
if (processArgs.processDisplayName) {
  setLoggerName(processArgs.processDisplayName);
}

function loadLogsContent(maxLines) {
  const text = fs.readFileSync(getLogsFilePath(), { encoding: 'utf8' });
  if (maxLines) {
    const lines = text
      .split('\n')
      .map(x => x.trim())
      .filter(x => x);
    return lines.slice(-maxLines).join('\n');
  }
  return text;
}

function configureLogger() {
  const logsFilePath = path.join(logsdir(), `${moment().format('YYYY-MM-DD-HH-mm')}-${process.pid}.ndjson`);
  setLogsFilePath(logsFilePath);
  setLoggerName('main');

  let logger = pinoms({
    redact: { paths: ['hostname'], remove: true },
    streams: [
      {
        stream: process.stdout,
        level: process.env.CONSOLE_LOG_LEVEL || process.env.LOG_LEVEL || 'info',
      },
      {
        stream: fs.createWriteStream(logsFilePath),
        level: process.env.FILE_LOG_LEVEL || process.env.LOG_LEVEL || 'info',
      },
    ],
  });

  setLogger(logger);
}

if (processArgs.listenApi) {
  configureLogger();
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
  configureLogger,
  loadLogsContent,
  getMainModule: () => require('./main'),
};
