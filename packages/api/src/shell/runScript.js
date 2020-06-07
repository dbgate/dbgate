const childProcessChecker = require('../utility/childProcessChecker');

async function runScript(func) {
  if (process.argv.includes('--checkParent')) {
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
