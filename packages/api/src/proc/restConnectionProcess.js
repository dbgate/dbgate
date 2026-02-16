const childProcessChecker = require('../utility/childProcessChecker');

function start() {
  childProcessChecker();
}

module.exports = { start };
