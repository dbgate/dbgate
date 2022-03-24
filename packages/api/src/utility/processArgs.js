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

function getPassArgs() {
  const res = [];
  if (global['NATIVE_MODULES']) {
    res.push('--native-modules', global['NATIVE_MODULES']);
  }
  if (global['PLUGINS_DIR']) {
    res.push('--plugins-dir', global['PLUGINS_DIR']);
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
};
