const os = require('os');
const path = require('path');
const fs = require('fs');
const cleanDirectory = require('./cleanDirectory');
const platformInfo = require('./platformInfo');
const processArgs = require('./processArgs');
const consoleObjectWriter = require('../shell/consoleObjectWriter');
const { getLogger } = require('dbgate-tools');
const logger = getLogger('directories');

const createDirectories = {};
const ensureDirectory = (dir, clean) => {
  if (!createDirectories[dir]) {
    if (clean && fs.existsSync(dir) && !platformInfo.isForkedApi) {
      logger.info(`Cleaning directory ${dir}`);
      cleanDirectory(dir);
    }
    if (!fs.existsSync(dir)) {
      logger.info(`Creating directory ${dir}`);
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
  (dirname, clean = false) =>
  () => {
    const dir = path.join(datadir(), dirname);
    ensureDirectory(dir, clean);

    return dir;
  };

const jsldir = dirFunc('jsl', true);
const rundir = dirFunc('run', true);
const uploadsdir = dirFunc('uploads', true);
const pluginsdir = dirFunc('plugins');
const archivedir = dirFunc('archive');
const appdir = dirFunc('apps');
const filesdir = dirFunc('files');

function packagedPluginsDir() {
  // console.log('CALL DIR FROM', new Error('xxx').stack);
  // console.log('__dirname', __dirname);
  // console.log('platformInfo.isElectronBundle', platformInfo.isElectronBundle);
  // console.log('platformInfo.isForkedApi', platformInfo.isForkedApi);
  if (platformInfo.isDevMode) {
    return path.resolve(__dirname, '../../../../plugins');
  }
  if (platformInfo.isDocker) {
    return '/home/dbgate-docker/plugins';
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

  return path.join(pluginsdir(), packageName, 'dist', 'backend.js');
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
  } catch (e) {
    logger.error('Error migrating data dir:', e.message);
  }
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
  packagedPluginsDir,
  packagedPluginList,
  getPluginBackendPath,
  resolveArchiveFolder,
  clearArchiveLinksCache,
};
