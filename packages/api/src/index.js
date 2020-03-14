// require('socket.io-client');

// "socket.io-client": "^2.3.0",
// "utf-8-validate": "^5.0.2",
// "uuid": "^3.4.0",
// "uws": "10.148.1"

const processName = process.argv[2];
if (processName && processName.endsWith('Process')) {
  const proc = require('./proc');

  const module = proc[processName];
  module.start();
} else {
  const main = require('./main');
  
  main.start();
}
