const fs = require('fs');
const os = require('os');
const path = require('path');
const processArgs = require('./processArgs');
const isElectron = require('is-electron');

const platform = process.env.OS_OVERRIDE ? process.env.OS_OVERRIDE : process.platform;
const isWindows = platform === 'win32';
const isMac = platform === 'darwin';
const isLinux = platform === 'linux';
const isDocker = fs.existsSync('/home/dbgate-docker/public');
const isDevMode = process.env.DEVMODE == '1';
const isBuiltWebMode = process.env.BUILTWEBMODE == '1';
const isNpmDist = !!global['IS_NPM_DIST'];
const isDbModel = !!global['IS_DB_MODEL'];
const isForkedApi = processArgs.isForkedApi;
const isAwsUbuntuLayout = fs.existsSync('/home/ubuntu/build/public');
const isAzureUbuntuLayout = fs.existsSync('/home/azureuser/build/public');

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
  isDevMode,
  isNpmDist,
  isSnap: process.env.ELECTRON_SNAP == 'true',
  isPortable: isWindows && process.env.PORTABLE_EXECUTABLE_DIR,
  isAppImage: process.env.DESKTOPINTEGRATION === 'AppImageLauncher',
  sshAuthSock: process.env.SSH_AUTH_SOCK,
  environment: process.env.NODE_ENV,
  platform,
  runningInWebpack: !!process.env.WEBPACK_DEV_SERVER_URL,
  allowShellConnection:
    (!processArgs.listenApiChild && !isNpmDist) ||
    !!process.env.SHELL_CONNECTION ||
    !!isElectron() ||
    !!isDbModel ||
    isDevMode,
  allowShellScripting:
    (!processArgs.listenApiChild && !isNpmDist) ||
    !!process.env.SHELL_SCRIPTING ||
    !!isElectron() ||
    !!isDbModel ||
    isDevMode,
  allowConnectionFromEnvVariables: !!isDbModel,
  defaultKeyfile: path.join(os.homedir(), '.ssh/id_rsa'),
  isAwsUbuntuLayout,
  isAzureUbuntuLayout,
};

module.exports = platformInfo;
