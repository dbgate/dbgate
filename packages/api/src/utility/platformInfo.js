const fs = require('fs');
const os = require('os');
const path = require('path');
const processArgs = require('./processArgs');
const isElectron = require('is-electron');
const { checkLicense } = require('./checkLicense');

const platform = process.env.OS_OVERRIDE ? process.env.OS_OVERRIDE : process.platform;
const isWindows = platform === 'win32';
const isMac = platform === 'darwin';
const isLinux = platform === 'linux';
const isDocker = fs.existsSync('/home/dbgate-docker/public');
const isDevMode = process.env.DEVMODE == '1';
const isNpmDist = !!global['IS_NPM_DIST'];
const isForkedApi = processArgs.isForkedApi;
const licenseError = checkLicense();
const isLicenseValid = licenseError == null;

// function moduleAvailable(name) {
//   try {
//     require.resolve(name);
//     return true;
//   } catch (e) {
//     return false;
//   }
// }

const platformInfo = {
  isWindows,
  isMac,
  isLinux,
  isDocker,
  isElectronBundle: isElectron() && !isDevMode,
  isForkedApi,
  isElectron: isElectron(),
  isLicenseValid,
  licenseError,
  isDevMode,
  isNpmDist,
  isSnap: process.env.ELECTRON_SNAP == 'true',
  isPortable: isWindows && process.env.PORTABLE_EXECUTABLE_DIR,
  isAppImage: process.env.DESKTOPINTEGRATION === 'AppImageLauncher',
  sshAuthSock: process.env.SSH_AUTH_SOCK,
  environment: process.env.NODE_ENV,
  platform,
  runningInWebpack: !!process.env.WEBPACK_DEV_SERVER_URL,
  allowShellConnection: (!processArgs.listenApiChild && !isNpmDist) || !!process.env.SHELL_CONNECTION || !!isElectron(),
  allowShellScripting: (!processArgs.listenApiChild && !isNpmDist) || !!process.env.SHELL_SCRIPTING || !!isElectron(),
  defaultKeyfile: path.join(os.homedir(), '.ssh/id_rsa'),
};

module.exports = platformInfo;
