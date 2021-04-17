function getNamedArg(name) {
  const argIndex = process.argv.indexOf(name);
  if (argIndex > 0) {
    return process.argv[argIndex + 1];
  }
  return null;
}

const checkParent = process.argv.includes('--checkParent');
const dynport = process.argv.includes('--dynport');
const nativeModules = getNamedArg('--native-modules');
const startProcess = getNamedArg('--start-process');
const isElectronBundle = process.argv.includes('--is-electron-bundle');

module.exports = {
  checkParent,
  nativeModules,
  startProcess,
  dynport,
  isElectronBundle,
};
