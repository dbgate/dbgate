const electron = require('electron');
const { fork } = require('child_process');
const Store = require('electron-store');
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

function hideSplash() {
  if (splashWindow) {
    splashWindow.destroy();
    splashWindow = null;
  }
  mainWindow.show();
}

function createWindow() {
  const bounds = store.get('winBounds');
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    ...bounds,
    show: false,
    webPreferences: {
      nodeIntegration: true,
    },
  });

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

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

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
