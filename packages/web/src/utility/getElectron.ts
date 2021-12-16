class ElectronApi {
  public port?: number;
  public authorization?: string;
  private ipcRenderer = getIpcRenderer();

  constructor(args) {
    this.port = args.port;
    this.authorization = args.authorization;
  }

  send(msg, args) {
    this.ipcRenderer.send(msg, args);
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
