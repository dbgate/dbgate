class ElectronApi {
  public port?: number;
  public authorization?: string;
  private ipcRenderer = getIpcRenderer();

  constructor(args) {
    this.port = args.port;
    this.authorization = args.authorization;
  }

  send(msg, args = null) {
    this.ipcRenderer.send(msg, args);
  }

  async showOpenDialog(options) {
    const res = await this.ipcRenderer.invoke('showOpenDialog', options);
    return res;
  }

  async showSaveDialog(options) {
    const res = await this.ipcRenderer.invoke('showSaveDialog', options);
    return res;
  }

  async showItemInFolder(path) {
    const res = await this.ipcRenderer.invoke('showItemInFolder', path);
    return res;
  }

  async openExternal(url) {
    await this.ipcRenderer.invoke('openExternal', url);
  }
}

let apiInstance = null;

function initializeElectron(args) {
  apiInstance = new ElectronApi(args);
  if (window['dbgate_recreateAxiosInstance']) {
    window['dbgate_recreateAxiosInstance']();
  }
  if (window['dbgate_recreateSocket']) {
    window['dbgate_recreateSocket']();
  }
}

window['dbgate_initializeElectron'] = initializeElectron;

function getIpcRenderer() {
  if (window['require']) {
    const electron = window['require']('electron');
    return electron?.ipcRenderer;
  }
  return null;
}

export function shouldWaitForElectronInitialize() {
  return !!getIpcRenderer() && !apiInstance;
}

export function isElectronAvailable() {
  return !!getIpcRenderer();
}

export default function getElectron(): ElectronApi {
  return apiInstance;
  // try {
  //   // @ts-ignore
  //   return ipcRenderer;
  // } catch (e) {
  //   return null;
  // }
  // if (window['require']) {
  //   const electron = window['require']('electron');
  //   console.log('electron?.ipcRenderer', electron?.ipcRenderer);
  //   return electron?.ipcRenderer;
  // }
  // return null;
}
