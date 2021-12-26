const argIndex = process.argv.indexOf('--native-modules');
const redirectFile = argIndex > 0 ? process.argv[argIndex + 1] : null;

function requireDynamic(file) {
  try {
    // @ts-ignore
    return __non_webpack_require__(redirectFile);
  } catch (err) {
    return require(redirectFile);
  }
}

module.exports = redirectFile ? requireDynamic(redirectFile) : require('./nativeModulesContent');
