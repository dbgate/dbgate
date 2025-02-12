const os = require('os');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const cleanDirectory = require('./cleanDirectory');
const platformInfo = require('./platformInfo');
const processArgs = require('./processArgs');
const consoleObjectWriter = require('../shell/consoleObjectWriter');
const { getLogger } = require('dbgate-tools');

let logsFilePath;

const createDirectories = {};
const ensureDirectory = (dir, clean) => {
  if (!createDirectories[dir]) {
    if (clean && fs.existsSync(dir) && !platformInfo.isForkedApi) {
      getLogger('directories').info(`Cleaning directory ${dir}`);
      cleanDirectory(dir, _.isNumber(clean) ? clean : null);
    }
    if (!fs.existsSync(dir)) {
      getLogger('directories').info(`Creating directory ${dir}`);
      fs.mkdirSync(dir);
    }
    createDirectories[dir] = true;
  }
};

function datadirCore() {
  if (process.env.WORKSPACE_DIR) {
    return process.env.WORKSPACE_DIR;
  }
  if (processArgs.workspaceDir) {
    return processArgs.workspaceDir;
  }
  return path.join(os.homedir(), '.dbgate');
}

function datadir() {
  const dir = datadirCore();
  ensureDirectory(dir);

  return dir;
}

const dirFunc =
  (dirname, clean, subdirs = []) =>
  () => {
    const dir = path.join(datadir(), dirname);
    ensureDirectory(dir, clean);
    for (const subdir of subdirs) {
      ensureDirectory(path.join(dir, subdir), false);
    }

    return dir;
  };

const jsldir = dirFunc('jsl', true);
const rundir = dirFunc('run', true);
const uploadsdir = dirFunc('uploads', true);
const pluginsdir = dirFunc('plugins');
const archivedir = processArgs.runE2eTests
  ? dirFunc('archive-e2etests', false, ['default'])
  : dirFunc('archive', false, ['default']);
const appdir = dirFunc('apps');
const filesdir = processArgs.runE2eTests ? dirFunc('files-e2etests') : dirFunc('files');
const logsdir = dirFunc('logs', 3600 * 24 * 7);

function packagedPluginsDir() {
  // console.log('CALL DIR FROM', new Error('xxx').stack);
  // console.log('__dirname', __dirname);
  // console.log('platformInfo.isElectronBundle', platformInfo.isElectronBundle);
  // console.log('platformInfo.isForkedApi', platformInfo.isForkedApi);
  if (platformInfo.isDevMode) {
    return path.resolve(__dirname, '../../../../plugins');
  }
  if (platformInfo.isBuiltWebMode) {
    return path.resolve(__dirname, '../../plugins');
  }
  if (platformInfo.isDocker) {
    return '/home/dbgate-docker/plugins';
  }
  if (platformInfo.isAwsUbuntuLayout) {
    return '/home/ubuntu/build/plugins';
  }
  if (platformInfo.isAzureUbuntuLayout) {
    return '/home/azureuser/build/plugins';
  }
  if (platformInfo.isNpmDist) {
    // node_modules
    return global['PLUGINS_DIR'];
  }
  if (processArgs.pluginsDir) {
    return processArgs.pluginsDir;
  }
  if (platformInfo.isElectronBundle) {
    return path.resolve(__dirname, '../../plugins');

    // if (platformInfo.isForkedApi) {
    //   return path.resolve(__dirname, '../plugins');
    // } else {
    //   return path.resolve(__dirname, '../../plugins');
    // }
  }
  if (processArgs.runE2eTests) {
    return path.resolve('packer/build/plugins');
  }
  return null;
}

const packagedPluginList =
  packagedPluginsDir() != null ? fs.readdirSync(packagedPluginsDir()).filter(x => x.startsWith('dbgate-plugin-')) : [];

function getPluginBackendPath(packageName) {
  if (packagedPluginList.includes(packageName)) {
    if (platformInfo.isDevMode) {
      return path.join(packagedPluginsDir(), packageName, 'src', 'backend', 'index.js');
    }
    return path.join(packagedPluginsDir(), packageName, 'dist', 'backend.js');
  }

  const res = path.join(pluginsdir(), packageName, 'dist', 'backend.js');
  if (fs.existsSync(res)) {
    return res;
  }

  return require.resolve(packageName);
}

let archiveLinksCache = {};

function resolveArchiveFolder(folder) {
  if (folder.endsWith('.link')) {
    if (!archiveLinksCache[folder]) {
      archiveLinksCache[folder] = fs.readFileSync(path.join(archivedir(), folder), 'utf-8');
    }
    return archiveLinksCache[folder];
  }
  return path.join(archivedir(), folder);
}

function clearArchiveLinksCache() {
  archiveLinksCache = {};
}

function migrateDataDir() {
  if (process.env.WORKSPACE_DIR) {
    return;
  }
  if (processArgs.workspaceDir) {
    return;
  }

  try {
    const oldDir = path.join(os.homedir(), 'dbgate-data');
    const newDir = path.join(os.homedir(), '.dbgate');
    if (fs.existsSync(oldDir) && !fs.existsSync(newDir)) {
      fs.renameSync(oldDir, newDir);
    }
  } catch (err) {
    getLogger('directories').error({ err }, 'Error migrating data dir');
  }
}

function setLogsFilePath(value) {
  logsFilePath = value;
}

function getLogsFilePath() {
  return logsFilePath;
}

migrateDataDir();

module.exports = {
  datadir,
  jsldir,
  rundir,
  uploadsdir,
  archivedir,
  appdir,
  ensureDirectory,
  pluginsdir,
  filesdir,
  logsdir,
  packagedPluginsDir,
  packagedPluginList,
  getPluginBackendPath,
  resolveArchiveFolder,
  clearArchiveLinksCache,
  getLogsFilePath,
  setLogsFilePath,
};
