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

function getPassArgs() {
  if (global['NATIVE_MODULES']) return ['--native-modules', global['NATIVE_MODULES']];
  return [];
}

module.exports = {
  checkParent,
  startProcess,
  isForkedApi,
  getPassArgs,
};
