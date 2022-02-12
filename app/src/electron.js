const electron = require('electron');
const os = require('os');
const fs = require('fs');
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

let isNativeMenu = true;

// require('@electron/remote/main').initialize();

const configRootPath = path.join(app.getPath('userData'), 'config-root.json');
let initialConfig = {};

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

log.transports.file.level = 'debug';
autoUpdater.logger = log;
// TODO - create settings for this
// appUpdater.channel = 'beta';

let commands = {};

function commandItem(id) {
  const command = commands[id];
  return {
    id,
    label: command ? command.menuName || command.toolbarName || command.name : id,
    accelerator: command ? command.keyText : undefined,
    enabled: command ? command.enabled : false,
    click() {
      mainWindow.webContents.send('run-command', id);
    },
  };
}

function buildMenu() {
  const template = _cloneDeepWith(mainMenuDefinition, item => {
    if (item.divider) {
      return { type: 'separator' };
    }

    if (item.command) {
      return commandItem(item.command);
    }
  });
  // const template = [
  //   {
  //     label: 'File',
  //     submenu: [
  //       commandItem('new.connection'),
  //       commandItem('new.sqliteDatabase'),
  //       commandItem('new.modelCompare'),
  //       commandItem('new.freetable'),
  //       { type: 'separator' },
  //       commandItem('file.open'),
  //       commandItem('file.openArchive'),
  //       { type: 'separator' },
  //       commandItem('group.save'),
  //       commandItem('group.saveAs'),
  //       commandItem('database.search'),
  //       { type: 'separator' },
  //       commandItem('tabs.closeTab'),
  //       commandItem('file.exit'),
  //     ],
  //   },
  //   {
  //     label: 'Window',
  //     submenu: [commandItem('new.query'), { type: 'separator' }, commandItem('tabs.closeAll'), { role: 'minimize' }],
  //   },

  //   // {
  //   //   label: 'Edit',
  //   //   submenu: [
  //   //     { role: 'undo' },
  //   //     { role: 'redo' },
  //   //     { type: 'separator' },
  //   //     { role: 'cut' },
  //   //     { role: 'copy' },
  //   //     { role: 'paste' },
  //   //   ],
  //   // },
  //   {
  //     label: 'View',
  //     submenu: [
  //       { role: 'reload' },
  //       { role: 'forcereload' },
  //       { role: 'toggledevtools' },
  //       { type: 'separator' },
  //       { role: 'resetzoom' },
  //       { role: 'zoomin' },
  //       { role: 'zoomout' },
  //       { type: 'separator' },
  //       { role: 'togglefullscreen' },
  //       commandItem('theme.changeTheme'),
  //     ],
  //   },
  //   {
  //     role: 'help',
  //     submenu: [
  //       {
  //         label: 'Documentation',
  //         click() {
  //           electron.shell.openExternal('https://github.com/dbgate/dbgate/wiki');
  //         },
  //       },
  //       {
  //         label: 'DbGate web',
  //         click() {
  //           electron.shell.openExternal('https://dbgate.org');
  //         },
  //       },
  //       {
  //         label: 'Report problem or feature request',
  //         click() {
  //           electron.shell.openExternal('https://github.com/dbgate/dbgate/issues/new');
  //         },
  //       },
  //       {
  //         label: 'Become sponsor',
  //         click() {
  //           electron.shell.openExternal('https://opencollective.com/dbgate');
  //         },
  //       },
  //       // {
  //       //   label: 'Discussions',
  //       //   click() {
  //       //     electron.shell.openExternal('https://github.com/dbgate/dbgate/discussions');
  //       //   },
  //       // },
  //       { type: 'separator' },
  //       commandItem('tabs.changelog'),
  //       commandItem('about.show'),
  //     ],
  //   },
  // ];

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
      mainWindow.setMenu(mainMenu);
      return;
    }

    menu.enabled = command.enabled;
  }
});
ipcMain.on('close-window', async (event, arg) => {
  mainWindow.close();
});
ipcMain.on('set-title', async (event, arg) => {
  mainWindow.setTitle(arg);
});
ipcMain.on('open-link', async (event, arg) => {
  electron.shell.openExternal(arg);
});
ipcMain.on('window-action', async (event, arg) => {
  switch (arg) {
    case 'minimize':
      mainWindow.minimize();
      break;
    case 'maximize':
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
      break;
    case 'close':
      mainWindow.close();
      break;
    case 'fullscreen':
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      break;
    case 'devtools':
      mainWindow.webContents.toggleDevTools();
      break;
    case 'reload':
      mainWindow.webContents.reloadIgnoringCache();
      break;
  }
  mainWindow.setTitle(arg);
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
ipcMain.handle('isNativeMenu', async () => {
  return isNativeMenu;
});

function createWindow() {
  const bounds = initialConfig['winBounds'];
  isNativeMenu = os.platform() == 'darwin' ? true : false;
  if (initialConfig['menuStyle'] == 'native') isNativeMenu = true;
  if (initialConfig['menuStyle'] == 'client') isNativeMenu = false;
  // isNativeMenu = true;

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'DbGate',
    frame: isNativeMenu,
    titleBarStyle: isNativeMenu ? undefined : 'hidden',
    ...bounds,
    icon: os.platform() == 'win32' ? 'icon.ico' : path.resolve(__dirname, '../icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      spellcheck: false,
    },
  });

  if (initialConfig['winIsMaximized']) {
    mainWindow.maximize();
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
        fs.writeFileSync(
          configRootPath,
          JSON.stringify({
            winBounds: mainWindow.getBounds(),
            winIsMaximized: mainWindow.isMaximized(),
          }),
          'utf-8'
        );
      } catch (err) {
        console.log('Error saving config-root:', err.message);
      }
    });
    mainWindow.loadURL(startUrl);
    if (os.platform() == 'linux') {
      mainWindow.setIcon(path.resolve(__dirname, '../icon.png'));
    }
  }

  const apiPackage = path.join(
    __dirname,
    process.env.DEVMODE ? '../../packages/api/src/index' : '../packages/api/dist/bundle.js'
  );

  global.API_PACKAGE = apiPackage;
  global.NATIVE_MODULES = path.join(__dirname, 'nativeModules');

  // console.log('global.API_PACKAGE', global.API_PACKAGE);
  const api = require(apiPackage);
  // console.log(
  //   'REQUIRED',
  //   path.resolve(
  //     path.join(__dirname, process.env.DEVMODE ? '../../packages/api/src/index' : '../packages/api/dist/bundle.js')
  //   )
  // );
  const main = api.getMainModule();
  main.initializeElectronSender(mainWindow.webContents);
  main.useAllControllers(null, electron);

  loadMainWindow();

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
}

function onAppReady() {
  if (!process.env.DEVMODE) {
    autoUpdater.checkForUpdatesAndNotify();
  }
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
  if (process.platform !== 'darwin') {
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
