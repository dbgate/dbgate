const byline = require('byline');
const { safeJsonParse, getLogger } = require('dbgate-tools');
const logger = getLogger();

const levelNames = {
  10: 'trace',
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'fatal',
};

const logDispatcher = method => data => {
  const json = safeJsonParse(data.toString());
  if (json && json.level && levelNames[json.level]) {
    logger[levelNames[json.level]](json || data.toString());
  } else {
    logger[method](json || data.toString());
  }
};

function pipeForkLogs(subprocess) {
  byline(subprocess.stdout).on('data', logDispatcher('info'));
  byline(subprocess.stderr).on('data', logDispatcher('error'));
}

module.exports = pipeForkLogs;
