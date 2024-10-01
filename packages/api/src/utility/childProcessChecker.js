const { getLogger, extractErrorLogData } = require('dbgate-tools');

const logger = getLogger('childProcessChecked');

let counter = 0;

function childProcessChecker() {
  setInterval(() => {
    try {
      process.send({ msgtype: 'ping', counter: counter++ });
    } catch (err) {
      // This will come once parent dies.
      // One way can be to check for error code ERR_IPC_CHANNEL_CLOSED
      //     and call process.exit()
      logger.error(extractErrorLogData(err), 'parent died');
      process.exit(1);
    }
  }, 1000);
}

module.exports = childProcessChecker;
