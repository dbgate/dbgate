const { getLogger, extractErrorLogData } = require('dbgate-tools');
const childProcessChecker = require('../utility/childProcessChecker');
const processArgs = require('../utility/processArgs');
const logger = getLogger();

async function runScript(func) {
  if (processArgs.checkParent) {
    childProcessChecker();
  }
  try {
    await func();
    process.exit(0);
  } catch (err) {
    logger.error(extractErrorLogData(err), `Error running script`);
    process.exit(1);
  }
}

module.exports = runScript;
