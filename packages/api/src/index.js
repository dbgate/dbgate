const { setLogConfig, getLogger, setLoggerName, extractErrorLogData } = require('dbgate-tools');
const processArgs = require('./utility/processArgs');
const fs = require('fs');
const moment = require('moment');
const path = require('path');
const { logsdir, setLogsFilePath, getLogsFilePath } = require('./utility/directories');
const currentVersion = require('./currentVersion');

const logger = getLogger('apiIndex');

process.on('uncaughtException', err => {
  logger.fatal(extractErrorLogData(err), 'Uncaught exception, exiting process');
  process.exit(1);
});

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

  const consoleLogLevel = process.env.CONSOLE_LOG_LEVEL || process.env.LOG_LEVEL || 'info';
  const fileLogLevel = process.env.FILE_LOG_LEVEL || process.env.LOG_LEVEL || 'debug';

  const logConfig = {
    base: { pid: process.pid },
    targets: [
      {
        type: 'console',
        // @ts-ignore
        level: consoleLogLevel,
      },
      {
        type: 'stream',
        // @ts-ignore
        level: fileLogLevel,
        stream: fs.createWriteStream(logsFilePath, { flags: 'a' }),
      },
    ],
  };

  // logger.info(`Initialized logging, console log level: ${consoleLogLevel}, file log level: ${fileLogLevel}`);

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

  // @ts-ignore
  setLogConfig(logConfig);
}

if (processArgs.listenApi) {
  configureLogger();
  logger.info(`Starting API process version ${currentVersion.version}`);

  if (process.env.DEBUG_PRINT_ENV_VARIABLES) {
    logger.info('Debug print environment variables:');
    for (const key of Object.keys(process.env)) {
      logger.info(`  ${key}: ${JSON.stringify(process.env[key])}`);
    }
  }
}

const shell = require('./shell/index');

global.DBGATE_PACKAGES = {
  'dbgate-tools': require('dbgate-tools'),
  'dbgate-sqltree': require('dbgate-sqltree'),
};

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
  currentVersion,
  // loadLogsContent,
  getMainModule: () => require('./main'),
};
