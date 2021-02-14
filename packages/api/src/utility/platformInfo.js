const fs = require('fs');
const os = require('os');
const path = require('path');

const p = process;
const platform = p.env.OS_OVERRIDE ? p.env.OS_OVERRIDE : p.platform;
const isWindows = platform === 'win32';
const isMac = platform === 'darwin';
const isLinux = platform === 'linux';
const isDocker = fs.existsSync('/home/dbgate-docker/build');

const platformInfo = {
  isWindows,
  isMac,
  isLinux,
  isDocker,
  isSnap: p.env.ELECTRON_SNAP == 'true',
  isPortable: isWindows && p.env.PORTABLE_EXECUTABLE_DIR,
  isAppImage: p.env.DESKTOPINTEGRATION === 'AppImageLauncher',
  sshAuthSock: p.env.SSH_AUTH_SOCK,
  environment: process.env.NODE_ENV,
  platform,
  runningInWebpack: !!p.env.WEBPACK_DEV_SERVER_URL,
  defaultKeyFile: path.join(os.homedir(), '.ssh/id_rsa'),
};

module.exports = platformInfo;
