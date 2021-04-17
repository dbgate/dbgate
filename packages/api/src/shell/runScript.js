const childProcessChecker = require('../utility/childProcessChecker');
const processArgs = require('../utility/processArgs');

async function runScript(func) {
  if (processArgs.checkParent) {
    childProcessChecker();
  }
  try {
    await func();
    process.exit(0);
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
}

module.exports = runScript;
