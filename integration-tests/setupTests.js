global.DBGATE_PACKAGES = {
  'dbgate-tools': require('dbgate-tools'),
  'dbgate-sqltree': require('dbgate-sqltree'),
};

const { prettyFactory } = require('pino-pretty');
const tmp = require('tmp');

const pretty = prettyFactory({
  colorize: true,
  translateTime: 'SYS:standard',
  ignore: 'pid,hostname',
});

global.console = {
  ...console,
  log: (...messages) => {
    try {
      const parsedMessage = JSON.parse(messages[0]);
      process.stdout.write(pretty(parsedMessage));
    } catch (error) {
      process.stdout.write(messages.join(' ') + '\n');
    }
  },
  debug: (...messages) => {
    process.stdout.write(messages.join(' ') + '\n');
  },
};

tmp.setGracefulCleanup();
