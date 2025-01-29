const path = require('path');

function getNamedArg(name) {
  const argIndex = process.argv.indexOf(name);
  if (argIndex > 0) {
    return process.argv[argIndex + 1];
  }
  return null;
}

const checkParent = process.argv.includes('--checkParent');
const startProcess = getNamedArg('--start-process');
const isForkedApi = process.argv.includes('--is-forked-api');
const pluginsDir = getNamedArg('--plugins-dir');
const workspaceDir = getNamedArg('--workspace-dir');
const processDisplayName = getNamedArg('--process-display-name');
const listenApi = process.argv.includes('--listen-api');
const listenApiChild = process.argv.includes('--listen-api-child') || listenApi;
const runE2eTests = process.argv.includes('--run-e2e-tests');

function getPassArgs() {
  const res = [];
  if (global['PLUGINS_DIR']) {
    res.push('--plugins-dir', global['PLUGINS_DIR']);
  } else if (runE2eTests) {
    res.push('--plugins-dir', path.resolve('packer/build/plugins'));
  }
  if (listenApiChild) {
    res.push('listen-api-child');
  }
  if (runE2eTests) {
    res.push('--run-e2e-tests');
  }
  return res;
}

module.exports = {
  checkParent,
  startProcess,
  isForkedApi,
  getPassArgs,
  pluginsDir,
  workspaceDir,
  listenApi,
  listenApiChild,
  processDisplayName,
  runE2eTests,
};
