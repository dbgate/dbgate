const electron = require('electron');
const os = require('os');
const fs = require('fs');
// const unhandled = require('electron-unhandled');
// const { openNewGitHubIssue, debugInfo } = require('electron-util');
const { Menu, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const _cloneDeepWith = require('lodash.clonedeepwith');

// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

const path = require('path');
const url = require('url');
const mainMenuDefinition = require('./mainMenuDefinition');
const { isProApp } = require('./proTools');
const updaterChannel = require('./updaterChannel');

// require('@electron/remote/main').initialize();

const configRootPath = path.join(app.getPath('userData'), 'config-root.json');
let saveConfigOnExit = true;
let initialConfig = {};
let apiLoaded = false;
let mainModule;
// let getLogger;
// let loadLogsContent;
let appUpdateStatus = '';
let settingsJson = {};

process.on('uncaughtException', function (error) {
  console.error('uncaughtException', error);
});

const isMac = () => os.platform() == 'darwin';

// unhandled({
//   showDialog: true,
//   reportButton: error => {
//     openNewGitHubIssue({
//       user: 'dbgate',
//       repo: 'dbgate',
//       body: `PLEASE DELETE SENSITIVE INFO BEFORE POSTING ISSUE!!!\n\n\`\`\`\n${
//         error.stack
//       }\n\`\`\`\n\n---\n\n${debugInfo()}\n\n\`\`\`\n${loadLogsContent ? loadLogsContent(50) : ''}\n\`\`\``,
//     });
//   },
//   logger: error => (getLogger ? getLogger('electron').fatal(error) : console.error(error)),
// });

try {
  initialConfig = JSON.parse(fs.readFileSync(configRootPath, { encoding: 'utf-8' }));
} catch (err) {
  console.log('Error loading config-root:', err.message);
  initialConfig = {};
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let mainMenu;
let runCommandOnLoad = null;

log.transports.file.level = 'debug';
autoUpdater.logger = log;
if (updaterChannel) {
  autoUpdater.channel = updaterChannel;
  autoUpdater.allowPrerelease = updaterChannel.includes('beta');
}
// TODO - create settings for this
// appUpdater.channel = 'beta';

let commands = {};

function formatKeyText(keyText) {
  if (!keyText) {
    return keyText;
  }
  if (os.platform() == 'darwin') {
    return keyText.replace('CtrlOrCommand+', 'Command+');
  }
  return keyText.replace('CtrlOrCommand+', 'Ctrl+');
}

function commandItem(item) {
  const id = item.command;
  const command = commands[id];
  if (item.skipInApp) {
    return { skip: true };
  }
  return {
    id,
    label: command ? command.menuName || command.toolbarName || command.name : id,
    accelerator: formatKeyText(command ? command.keyText : undefined),
    enabled: command ? command.enabled : false,
    click() {
      if (mainWindow) {
        mainWindow.webContents.send('run-command', id);
      } else {
        runCommandOnLoad = id;
        createWindow();
      }
    },
  };
}

function buildMenu() {
  let template = _cloneDeepWith(mainMenuDefinition({ editMenu: true, isMac: isMac() }), item => {
    if (item.divider) {
      return { type: 'separator' };
    }

    if (item.command) {
      return commandItem(item);
    }
  });

  template = _cloneDeepWith(template, item => {
    if (Array.isArray(item) && item.find(x => x.skip)) {
      return item.filter(x => x && !x.skip);
    }
  });

  if (isMac()) {
    template = [
      {
        label: 'DbGate',
        submenu: [
          commandItem({ command: 'about.show' }),
          { role: 'services' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { role: 'quit' },
        ],
      },
      ...template,
    ];
  }

  return Menu.buildFromTemplate(template);
}

ipcMain.on('update-commands', async (event, arg) => {
  commands = JSON.parse(arg);
  for (const key of Object.keys(commands)) {
    const menu = mainMenu.getMenuItemById(key);
    if (!menu) continue;
    const command = commands[key];

    // rebuild menu
    if (menu.label != command.text || menu.accelerator != command.keyText) {
      mainMenu = buildMenu();

      Menu.setApplicationMenu(mainMenu);
      // mainWindow.setMenu(mainMenu);
      return;
    }

    menu.enabled = command.enabled;
  }
});
ipcMain.on('quit-app', async (event, arg) => {
  if (isMac()) {
    app.quit();
  } else {
    mainWindow.close();
  }
});
ipcMain.on('reset-settings', async (event, arg) => {
  try {
    saveConfigOnExit = false;
    fs.unlinkSync(configRootPath);
    console.log('Deleted file:', configRootPath);
  } catch (err) {
    console.log('Error deleting config-root:', err.message);
  }

  if (isMac()) {
    app.quit();
  } else {
    mainWindow.close();
  }
});
ipcMain.on('set-title', async (event, arg) => {
  mainWindow.setTitle(arg);
});
ipcMain.on('open-link', async (event, arg) => {
  electron.shell.openExternal(arg);
});
ipcMain.on('open-dev-tools', () => {
  mainWindow.webContents.openDevTools();
});
ipcMain.on('app-started', async (event, arg) => {
  if (runCommandOnLoad) {
    mainWindow.webContents.send('run-command', runCommandOnLoad);
    runCommandOnLoad = null;
  }

  if (initialConfig['winIsMaximized']) {
    mainWindow.webContents.send('setIsMaximized', true);
  }
  if (autoUpdater.isUpdaterActive()) {
    mainWindow.webContents.send('setAppUpdaterActive');
  }
  if (!process.env.DEVMODE) {
    if (settingsJson['app.autoUpdateMode'] != 'skip') {
      autoUpdater.autoDownload = settingsJson['app.autoUpdateMode'] == 'download';
      autoUpdater.checkForUpdates();
    }
  }
});
ipcMain.on('window-action', async (event, arg) => {
  if (!mainWindow) {
    return;
  }
  switch (arg) {
    case 'minimize':
      mainWindow.minimize();
      break;
    case 'maximize':
      mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
      break;
    case 'close':
      mainWindow.close();
      break;
    case 'fullscreen-on':
      mainWindow.setFullScreen(true);
      break;
    case 'fullscreen-off':
      mainWindow.setFullScreen(false);
      break;
    case 'devtools':
      mainWindow.webContents.toggleDevTools();
      break;
    case 'reload':
      mainWindow.webContents.reloadIgnoringCache();
      break;
    case 'zoomin':
      mainWindow.webContents.zoomLevel += 0.5;
      break;
    case 'zoomout':
      mainWindow.webContents.zoomLevel -= 0.5;
      break;
    case 'zoomreset':
      mainWindow.webContents.zoomLevel = 0;
      break;

    // edit
    case 'undo':
      mainWindow.webContents.undo();
      break;
    case 'redo':
      mainWindow.webContents.redo();
      break;
    case 'cut':
      mainWindow.webContents.cut();
      break;
    case 'copy':
      mainWindow.webContents.copy();
      break;
    case 'paste':
      mainWindow.webContents.paste();
      break;
    case 'selectAll':
      mainWindow.webContents.selectAll();
      break;
  }
});

ipcMain.handle('showOpenDialog', async (event, options) => {
  const res = electron.dialog.showOpenDialogSync(mainWindow, options);
  return res;
});
ipcMain.handle('showSaveDialog', async (event, options) => {
  const res = electron.dialog.showSaveDialogSync(mainWindow, options);
  return res;
});
ipcMain.handle('showItemInFolder', async (event, path) => {
  electron.shell.showItemInFolder(path);
});
ipcMain.handle('openExternal', async (event, url) => {
  electron.shell.openExternal(url);
});
ipcMain.on('downloadUpdate', async (event, url) => {
  autoUpdater.downloadUpdate();
  changeAppUpdateStatus({
    icon: 'icon loading',
    message: `Downloading update...`,
  });
});
ipcMain.on('applyUpdate', async (event, url) => {
  autoUpdater.quitAndInstall(false, true);
});
ipcMain.on('check-for-updates', async (event, url) => {
  autoUpdater.autoDownload = false;
  autoUpdater.checkForUpdates();
});

function fillMissingSettings(value) {
  const res = {
    ...value,
  };
  if (value['app.useNativeMenu'] !== true && value['app.useNativeMenu'] !== false) {
    res['app.useNativeMenu'] = false;
    // res['app.useNativeMenu'] = os.platform() == 'darwin' ? true : false;
  }
  return res;
}

function ensureBoundsVisible(bounds) {
  const area = electron.screen.getDisplayMatching(bounds).workArea;

  let { x, y, width, height } = bounds;

  const isWithinDisplay =
    x >= area.x && x + width <= area.x + area.width && y >= area.y && y + height <= area.y + area.height;

  if (!isWithinDisplay) {
    width = Math.min(width, area.width);
    height = Math.min(height, area.height);

    if (width < 400) width = 400;
    if (height < 300) height = 300;

    x = area.x; // + Math.round(area.width - width / 2);
    y = area.y; // + Math.round(area.height - height / 2);
  }

  return { x, y, width, height };
}

function createWindow() {
  const datadir = path.join(os.homedir(), '.dbgate');

  try {
    settingsJson = fillMissingSettings(
      JSON.parse(fs.readFileSync(path.join(datadir, 'settings.json'), { encoding: 'utf-8' }))
    );
  } catch (err) {
    console.log('Error loading settings.json:', err.message);
    settingsJson = fillMissingSettings({});
  }

  let bounds = initialConfig['winBounds'];
  if (bounds) {
    bounds = ensureBoundsVisible(bounds);
  }
  useNativeMenu = settingsJson['app.useNativeMenu'];

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: isProApp() ? 'DbGate Premium' : 'DbGate',
    frame: useNativeMenu,
    titleBarStyle: useNativeMenu ? undefined : 'hidden',
    ...bounds,
    icon: os.platform() == 'win32' ? 'icon.ico' : path.resolve(__dirname, '../icon.png'),
    partition: isProApp() ? 'persist:dbgate-premium' : 'persist:dbgate',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      spellcheck: false,
    },
  });

  if (initialConfig['winIsMaximized']) {
    mainWindow.maximize();
  }
  if (settingsJson['app.fullscreen']) {
    mainWindow.setFullScreen(true);
  }

  mainMenu = buildMenu();
  mainWindow.setMenu(mainMenu);

  function loadMainWindow() {
    const startUrl =
      process.env.ELECTRON_START_URL ||
      url.format({
        pathname: path.join(__dirname, '../packages/web/public/index.html'),
        protocol: 'file:',
        slashes: true,
      });
    mainWindow.on('close', () => {
      try {
        if (saveConfigOnExit) {
          fs.writeFileSync(
            configRootPath,
            JSON.stringify({
              winBounds: mainWindow.getBounds(),
              winIsMaximized: mainWindow.isMaximized(),
            }),
            'utf-8'
          );
        }
      } catch (err) {
        console.log('Error saving config-root:', err.message);
      }
    });

    // mainWindow.webContents.toggleDevTools();

    mainWindow.loadURL(startUrl);
    if (os.platform() == 'linux') {
      mainWindow.setIcon(path.resolve(__dirname, '../icon.png'));
    }

    mainWindow.on('maximize', () => {
      mainWindow.webContents.send('setIsMaximized', true);
    });

    mainWindow.on('unmaximize', () => {
      mainWindow.webContents.send('setIsMaximized', false);
    });

    // app.on('browser-window-focus', () => {
    //   const bounds = ensureBoundsVisible(mainWindow.getBounds());
    //   mainWindow.setBounds(bounds);
    // });
  }

  if (!apiLoaded) {
    const apiPackage = path.join(
      __dirname,
      process.env.DEVMODE ? '../../packages/api/src/index' : '../packages/api/dist/bundle.js'
    );

    global.API_PACKAGE = apiPackage;

    // console.log('global.API_PACKAGE', global.API_PACKAGE);
    const api = require(apiPackage);
    // console.log(
    //   'REQUIRED',
    //   path.resolve(
    //     path.join(__dirname, process.env.DEVMODE ? '../../packages/api/src/index' : '../packages/api/dist/bundle.js')
    //   )
    // );
    api.configureLogger();
    const main = api.getMainModule();
    main.useAllControllers(null, electron);
    mainModule = main;
    // getLogger = api.getLogger;
    // loadLogsContent = api.loadLogsContent;
    apiLoaded = true;
  }
  mainModule.setElectronSender(mainWindow.webContents);

  loadMainWindow();

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
    mainModule.setElectronSender(null);
  });
}

function changeAppUpdateStatus(status) {
  appUpdateStatus = status;
  mainWindow.webContents.send('app-update-status', appUpdateStatus);
}

autoUpdater.on('checking-for-update', () => {
  console.log('Checking for updates');
  changeAppUpdateStatus({
    icon: 'icon loading',
    message: 'Checking for updates...',
  });
});

autoUpdater.on('update-available', info => {
  console.log('Update available', info);
  if (autoUpdater.autoDownload) {
    changeAppUpdateStatus({
      icon: 'icon loading',
      message: `Downloading update...`,
    });
  } else {
    mainWindow.webContents.send('update-available', info.version);
    changeAppUpdateStatus({
      icon: 'icon download',
      message: `Update available`,
    });
  }
});

autoUpdater.on('update-not-available', info => {
  console.log('Update not available', info);
  changeAppUpdateStatus({
    icon: 'icon check',
    message: `No new updates`,
  });
});

autoUpdater.on('update-downloaded', info => {
  console.log('Update downloaded from', info);
  changeAppUpdateStatus({
    icon: 'icon download',
    message: `Downloaded ${info.version}`,
  });
  mainWindow.webContents.send('downloaded-new-version', info.version);
});

autoUpdater.on('error', error => {
  changeAppUpdateStatus({
    icon: 'icon error',
    message: `Autoupdate error`,
  });
  console.error('Update error', error);
});

function onAppReady() {
  createWindow();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', onAppReady);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (!isMac()) {
    app.quit();
  }
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
