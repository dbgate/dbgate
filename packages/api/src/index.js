const { setLogger, getLogger, setLoggerName } = require('dbgate-tools');
const processArgs = require('./utility/processArgs');
const fs = require('fs');
const moment = require('moment');
const path = require('path');
const { logsdir, setLogsFilePath, getLogsFilePath } = require('./utility/directories');
const { createLogger } = require('pinomin');

if (processArgs.startProcess) {
  setLoggerName(processArgs.startProcess.replace(/Process$/, ''));
}
if (processArgs.processDisplayName) {
  setLoggerName(processArgs.processDisplayName);
}

// function loadLogsContent(maxLines) {
//   const text = fs.readFileSync(getLogsFilePath(), { encoding: 'utf8' });
//   if (maxLines) {
//     const lines = text
//       .split('\n')
//       .map(x => x.trim())
//       .filter(x => x);
//     return lines.slice(-maxLines).join('\n');
//   }
//   return text;
// }

function configureLogger() {
  const logsFilePath = path.join(logsdir(), `${moment().format('YYYY-MM-DD-HH-mm')}-${process.pid}.ndjson`);
  setLogsFilePath(logsFilePath);
  setLoggerName('main');

  const logger = createLogger({
    base: { pid: process.pid },
    targets: [
      {
        type: 'console',
        // @ts-ignore
        level: process.env.CONSOLE_LOG_LEVEL || process.env.LOG_LEVEL || 'info',
      },
      {
        type: 'stream',
        // @ts-ignore
        level: process.env.FILE_LOG_LEVEL || process.env.LOG_LEVEL || 'info',
        stream: fs.createWriteStream(logsFilePath, { flags: 'a' }),
      },
    ],
  });

  // const streams = [];
  // if (!platformInfo.isElectron) {
  //   streams.push({
  //     stream: process.stdout,
  //     level: process.env.CONSOLE_LOG_LEVEL || process.env.LOG_LEVEL || 'info',
  //   });
  // }

  // streams.push({
  //   stream: fs.createWriteStream(logsFilePath),
  //   level: process.env.FILE_LOG_LEVEL || process.env.LOG_LEVEL || 'info',
  // });

  // let logger = pinoms({
  //   redact: { paths: ['hostname'], remove: true },
  //   streams,
  // });

  // // @ts-ignore
  // let logger = pino({
  //   redact: { paths: ['hostname'], remove: true },
  //   transport: {
  //     targets: [
  //       {
  //         level: process.env.CONSOLE_LOG_LEVEL || process.env.LOG_LEVEL || 'info',
  //         target: 'pino/file',
  //       },
  //       {
  //         level: process.env.FILE_LOG_LEVEL || process.env.LOG_LEVEL || 'info',
  //         target: 'pino/file',
  //         options: { destination: logsFilePath },
  //       },
  //     ],
  //   },
  // });

  setLogger(logger);
}

if (processArgs.listenApi) {
  configureLogger();
}

const shell = require('./shell/index');
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
  // loadLogsContent,
  getMainModule: () => require('./main'),
};
