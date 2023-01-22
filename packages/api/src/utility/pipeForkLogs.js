const byline = require('byline');
const { safeJsonParse, getLogger } = require('dbgate-tools');
const logger = getLogger();

const logDispatcher = method => data => {
  const json = safeJsonParse(data.toString());
  logger[method](json || data.toString());
};

function pipeForkLogs(subprocess) {
  byline(subprocess.stdout).on('data', logDispatcher('info'));
  byline(subprocess.stderr).on('data', logDispatcher('error'));
}

module.exports = pipeForkLogs;
