const electron = require('electron');
const os = require('os');
const { Menu, ipcMain } = require('electron');
const { fork } = require('child_process');
const { autoUpdater } = require('electron-updater');
const Store = require('electron-store');
const log = require('electron-log');

// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

const path = require('path');
const url = require('url');

const store = new Store();

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
      mainWindow.webContents.executeJavaScript(`dbgate_runCommand('${id}')`);
    },
  };
}

function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        commandItem('new.connection'),
        commandItem('file.open'),
        commandItem('group.save'),
        commandItem('group.saveAs'),
        { type: 'separator' },
        commandItem('tabs.closeTab'),
        commandItem('file.exit'),
      ],
    },
    {
      label: 'Window',
      submenu: [commandItem('new.query'), { type: 'separator' }, commandItem('tabs.closeAll'), { role: 'minimize' }],
    },

    // {
    //   label: 'Edit',
    //   submenu: [
    //     { role: 'undo' },
    //     { role: 'redo' },
    //     { type: 'separator' },
    //     { role: 'cut' },
    //     { role: 'copy' },
    //     { role: 'paste' },
    //   ],
    // },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forcereload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        commandItem('theme.changeTheme'),
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'dbgate.org',
          click() {
            require('electron').shell.openExternal('https://dbgate.org');
          },
        },
        {
          label: 'DbGate on GitHub',
          click() {
            require('electron').shell.openExternal('https://github.com/dbgate/dbgate');
          },
        },
        {
          label: 'DbGate on docker hub',
          click() {
            require('electron').shell.openExternal('https://hub.docker.com/r/dbgate/dbgate');
          },
        },
        {
          label: 'Report problem or feature request',
          click() {
            require('electron').shell.openExternal('https://github.com/dbgate/dbgate/issues/new');
          },
        },
        commandItem('about.show'),
      ],
    },
  ];

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

function createWindow() {
  const bounds = store.get('winBounds');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'DbGate',
    ...bounds,
    icon: os.platform() == 'win32' ? 'icon.ico' : path.resolve(__dirname, '../icon.png'),
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    },
  });

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
    mainWindow.webContents.on('did-finish-load', function () {
      // hideSplash();
    });
    mainWindow.on('close', () => {
      store.set('winBounds', mainWindow.getBounds());
    });
    mainWindow.loadURL(startUrl);
    if (os.platform() == 'linux') {
      mainWindow.setIcon(path.resolve(__dirname, '../icon.png'));
    }
  }

  if (process.env.ELECTRON_START_URL) {
    loadMainWindow();
  } else {
    const apiProcess = fork(path.join(__dirname, '../packages/api/dist/bundle.js'), [
      '--dynport',
      '--is-electron-bundle',
      '--native-modules',
      path.join(__dirname, 'nativeModules'),
      // '../../../src/nativeModules'
    ]);
    apiProcess.on('message', msg => {
      if (msg.msgtype == 'listening') {
        const { port, authorization } = msg;
        global['port'] = port;
        global['authorization'] = authorization;
        loadMainWindow();
      }
    });
  }

  // and load the index.html of the app.
  // mainWindow.loadURL('http://localhost:3000');

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
}

function onAppReady() {
  autoUpdater.checkForUpdatesAndNotify();
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
