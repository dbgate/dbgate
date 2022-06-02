class ElectronApi {
  private ipcRenderer = getIpcRenderer();
  winid = null;

  constructor() {
    this.winid = window.process?.argv?.find(x => x.startsWith('winid='))?.substring('winid='.length);
  }

  send(msg, args = null) {
    this.ipcRenderer.send(msg, args);
  }

  async showOpenDialog(options) {
    const res = await this.invoke('showOpenDialog', options);
    return res;
  }

  async showSaveDialog(options) {
    const res = await this.invoke('showSaveDialog', options);
    return res;
  }

  async showItemInFolder(path) {
    const res = await this.invoke('showItemInFolder', path);
    return res;
  }

  async openExternal(url) {
    await this.invoke('openExternal', url);
  }

  async invoke(route, args) {
    const res = await this.ipcRenderer.invoke(route, { winid: this.winid, args });
    return res;
  }

  async invokeApi(route, args) {
    const res = await this.ipcRenderer.invoke(route, args);
    return res;
  }

  addEventListener(channel: string, listener: Function) {
    this.ipcRenderer.on(channel, listener);
  }

  removeEventListener(channel: string, listener: Function) {
    this.ipcRenderer.removeListener(channel, listener);
  }
}

function getIpcRenderer() {
  if (window['require']) {
    const electron = window['require']('electron');
    return electron?.ipcRenderer;
  }
  return null;
}

export function isElectronAvailable() {
  return !!getIpcRenderer();
}

const apiInstance = isElectronAvailable() ? new ElectronApi() : null;

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
