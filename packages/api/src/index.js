const shell = require('./shell');
// require('socket.io-client');

// "socket.io-client": "^2.3.0",
// "utf-8-validate": "^5.0.2",
// "uuid": "^3.4.0",
// "uws": "10.148.1"

const argument = process.argv[2];
if (argument && argument.endsWith('Process')) {
  const proc = require('./proc');

  const module = proc[argument];
  module.start();
} else if (!module['parent'] && !process.argv.includes('--checkParent')) {
  const main = require('./main');

  main.start(argument);
}

module.exports = {
  ...shell,
  mainModule: main,
};
