const { getLogger, extractErrorLogData } = require('dbgate-tools');
const childProcessChecker = require('../utility/childProcessChecker');
const processArgs = require('../utility/processArgs');
const logger = getLogger();

async function runScript(func) {
  if (processArgs.checkParent) {
    childProcessChecker();
  }

  if (process.send && process.env.DBGATE_HAS_VOLATILE_CONNS) {
    await new Promise(resolve => {
      const timeout = setTimeout(resolve, 5000);
      const handler = message => {
        if (message?.msgtype === 'volatile-connections-response') {
          process.removeListener('message', handler);
          clearTimeout(timeout);
          require('../controllers/connections').registerVolatileConnections(message.conns);
          resolve();
        }
      };
      process.on('message', handler);
      process.send({ msgtype: 'get-volatile-connections' });
    });
  }

  try {
    await func();
    process.exit(0);
  } catch (err) {
    logger.error(extractErrorLogData(err), `DBGM-00158 Error running script`);
    process.exit(1);
  }
}

module.exports = runScript;
