const shell = require('./shell');

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
  getMainModule: () => require('./main'),
};
