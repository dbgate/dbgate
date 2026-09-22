const { createLineStream } = require('./lineStream');
const { safeJsonParse, getLogger } = require('dbgate-tools');
const logger = getLogger();

const logDispatcher = method => data => {
  const json = safeJsonParse(data.toString());
  if (json && json.level) {
    logger.log(json);
  } else {
    logger[method](json || data.toString());
  }
};

function pipeForkLogs(subprocess) {
  createLineStream(subprocess.stdout).on('data', logDispatcher('info'));
  createLineStream(subprocess.stderr).on('data', logDispatcher('error'));
}

module.exports = pipeForkLogs;
