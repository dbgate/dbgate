const electron = require('electron');
const os = require('os');
const fs = require('fs');
const { Menu } = require('electron');
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
let splashWindow;

log.transports.file.level = 'debug';
autoUpdater.logger = log;

function datadir() {
  const dir = path.join(os.homedir(), 'dbgate-data');
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir);
    } catch (err) {
      console.error(`Error creating ${dir} directory`, err);
    }
  }
  return dir;
}

function hideSplash() {
  if (splashWindow) {
    splashWindow.destroy();
    splashWindow = null;
  }
  mainWindow.show();
}

function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Connect to database',
          click() {
            mainWindow.webContents.executeJavaScript(`dbgate_createNewConnection()`);
          },
        },
        {
          label: 'New query',
          click() {
            mainWindow.webContents.executeJavaScript(`dbgate_newQuery()`);
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [{ role: 'copy' }, { role: 'paste' }],
    },
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
      ],
    },
    {
      role: 'window',
      submenu: [
        {
          label: 'Close all tabs',
          click() {
            mainWindow.webContents.executeJavaScript('dbgate_closeAll()');
          },
        },
        { type: 'separator' },
        { role: 'minimize' },
        { role: 'close' },
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
            require('electron').shell.openExternal('https://github.com/dbshell/dbgate');
          },
        },
        {
          label: 'DbGate on docker hub',
          click() {
            require('electron').shell.openExternal('https://hub.docker.com/r/dbgate/dbgate');
          },
        },
        {
          label: 'About',
          click() {
            mainWindow.webContents.executeJavaScript(`dbgate_showAbout()`);
          },
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}

function createWindow() {
  const bounds = store.get('winBounds');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'DbGate',
    ...bounds,
    icon: os.platform() == 'win32' ? 'icon.ico' : path.resolve(__dirname, '../icon.png'),
    show: false,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    },
  });

  mainWindow.setMenu(buildMenu());

  function loadMainWindow() {
    const startUrl =
      process.env.ELECTRON_START_URL ||
      url.format({
        pathname: path.join(__dirname, '../packages/web/build/index.html'),
        protocol: 'file:',
        slashes: true,
      });
    mainWindow.webContents.on('did-finish-load', function () {
      hideSplash();
    });
    mainWindow.on('close', () => {
      store.set('winBounds', mainWindow.getBounds());
    });
    mainWindow.loadURL(startUrl);
    if (os.platform() == 'linux') {
      const iconFile = path.join(datadir(), 'dbgate-icon.png');
      fs.copyFileSync(path.resolve(__dirname, '../icon.png'), iconFile);
      mainWindow.setIcon(iconFile);
    }
  }

  splashWindow = new BrowserWindow({
    width: 300,
    height: 120,
    transparent: true,
    frame: false,
  });
  splashWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, '../packages/web/build/splash.html'),
      protocol: 'file:',
      slashes: true,
    })
  );

  if (process.env.ELECTRON_START_URL) {
    loadMainWindow();
  } else {
    const apiProcess = fork(path.join(__dirname, '../packages/api/dist/bundle.js'), ['--dynport']);
    apiProcess.on('message', (msg) => {
      if (msg.msgtype == 'listening') {
        const { port } = msg;
        global['port'] = port;
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
