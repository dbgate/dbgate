function getNamedArg(name) {
  const argIndex = process.argv.indexOf(name);
  if (argIndex > 0) {
    return process.argv[argIndex + 1];
  }
  return null;
}

const checkParent = process.argv.includes('--checkParent');
const nativeModules = getNamedArg('--native-modules');
const startProcess = getNamedArg('--start-process');
const isForkedApi = process.argv.includes('--is-forked-api');

module.exports = {
  checkParent,
  nativeModules,
  startProcess,
  isForkedApi,
};
