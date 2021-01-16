const msnodesqlv8 = () => require('msnodesqlv8');

const argIndex = process.argv.indexOf('--native-modules');
const redirectFile = argIndex > 0 ? process.argv[argIndex + 1] : null;

// @ts-ignore
module.exports = redirectFile ? __non_webpack_require__(redirectFile) : { msnodesqlv8 };
