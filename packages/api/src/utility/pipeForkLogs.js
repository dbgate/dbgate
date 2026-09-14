const byline = require('byline');
const { safeJsonParse, getLogger } = require('dbgate-tools');
const logger = getLogger();

// Node.js prints process warnings (deprecations, experimental features, ...) to stderr as two lines,
// eg. "(node:1234) [DEP0040] DeprecationWarning: ..." followed by
// "(Use `node --trace-deprecation ...` to show where the warning was created)". The second line is
// only a hint how to get a stack trace for the warning, it is not an error, so it is not logged as
// one. The warning itself is kept, only the hint line is dropped. The executable name comes from
// process.argv0, so it can also be node.exe, electron or a packaged DbGate build - therefore it is
// not matched exactly. Backticks around the command are optional.
const NODE_WARNING_HINT_REGEX =
  /^\(Use\s+.*--trace-(?:deprecation|warnings).*\s+to show where the warning was created\)$/;

const logDispatcher = method => data => {
  const line = data.toString();
  const json = safeJsonParse(line);
  if (json && json.level) {
    logger.log(json);
  } else {
    if (!json && NODE_WARNING_HINT_REGEX.test(line.trim())) return;
    logger[method](json || line);
  }
};

function pipeForkLogs(subprocess) {
  byline(subprocess.stdout).on('data', logDispatcher('info'));
  byline(subprocess.stderr).on('data', logDispatcher('error'));
}

module.exports = pipeForkLogs;
