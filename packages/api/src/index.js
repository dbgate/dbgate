const { setLogConfig, getLogger, setLoggerName, extractErrorLogData } = require('dbgate-tools');
const processArgs = require('./utility/processArgs');
const fs = require('fs');
const moment = require('moment');
const path = require('path');
const { logsdir, setLogsFilePath, getLogsFilePath } = require('./utility/directories');
const currentVersion = require('./currentVersion');
const _ = require('lodash');
const { resolveEnvFileSecrets } = require('./utility/envFileSecrets');

// must run before any code reads process.env; child processes inherit the resolved values
const envFileSecrets = resolveEnvFileSecrets(process.env);

const logger = getLogger('apiIndex');

// Fail closed: continuing without a secret could eg. silently disable authentication (missing PASSWORD).
// Checked here, not only with --listen-api, because dbgate-serve starts the API without that flag.
if (envFileSecrets.errors.length > 0) {
  for (const { name, error } of envFileSecrets.errors) {
    logger.fatal({ variable: name, error }, 'DBGM-00000 Error reading file referenced by environment variable');
  }
  process.exit(1);
}

process.on('uncaughtException', err => {
  logger.fatal(extractErrorLogData(err), 'DBGM-00259 Uncaught exception, exiting process');
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
  const { initializeRecentLogProvider, pushToRecentLogs } = require('./utility/appLogStore');
  initializeRecentLogProvider();

  const logsFilePath = path.join(logsdir(), `${moment().format('YYYY-MM-DD-HH-mm')}-${process.pid}.ndjson`);
  setLogsFilePath(logsFilePath);
  setLoggerName('main');

  const consoleLogLevel = process.env.CONSOLE_LOG_LEVEL || process.env.LOG_LEVEL || 'info';
  const fileLogLevel = process.env.FILE_LOG_LEVEL || process.env.LOG_LEVEL || 'debug';

  const streamsByDatePart = {};

  const logConfig = {
    base: { pid: process.pid },
    targets: [
      {
        type: 'console',
        // @ts-ignore
        level: consoleLogLevel,
      },
      {
        type: 'objstream',
        // @ts-ignore
        level: fileLogLevel,
        objstream: {
          send(msg) {
            const datePart = moment(msg.time).format('YYYY-MM-DD');
            if (!streamsByDatePart[datePart]) {
              streamsByDatePart[datePart] = fs.createWriteStream(
                path.join(logsdir(), `${moment().format('YYYY-MM-DD-HH-mm')}-${process.pid}.ndjson`),
                { flags: 'a' }
              );
            }
            const additionals = {};
            const finalMsg =
              _.isString(msg.msg) && msg.msg.match(/^DBGM-\d\d\d\d\d/)
                ? {
                    ...msg,
                    msg: msg.msg.substring(10).trimStart(),
                    msgcode: msg.msg.substring(0, 10),
                    ...additionals,
                  }
                : {
                    ...msg,
                    ...additionals,
                  };
            streamsByDatePart[datePart].write(`${JSON.stringify(finalMsg)}\n`);
            pushToRecentLogs(finalMsg);
          },
        },
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
  logger.info(`DBGM-00026 Starting API process version ${currentVersion.version}`);

  if (envFileSecrets.loaded.length > 0) {
    logger.info({ variables: envFileSecrets.loaded }, 'DBGM-00000 Loaded environment variables from *_FILE files');
  }
  if (envFileSecrets.skipped.length > 0) {
    logger.warn(
      { variables: envFileSecrets.skipped },
      'DBGM-00000 Environment variables set both directly and via *_FILE, using the direct value'
    );
  }

  if (process.env.DEBUG_PRINT_ENV_VARIABLES) {
    logger.info('DBGM-00027 Debug print environment variables:');
    for (const key of Object.keys(process.env)) {
      logger.info(`  ${key}: ${JSON.stringify(process.env[key])}`);
    }
  }
}

const shell = require('./shell/index');

global.DBGATE_PACKAGES = {
  'dbgate-tools': require('dbgate-tools'),
  'dbgate-sqltree': require('dbgate-sqltree'),
  'dbgate-datalib': require('dbgate-datalib'),
};

if (processArgs.startProcess) {
  const proc = require('./proc');
  const processModule = proc[processArgs.startProcess];
  processModule.start();
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
