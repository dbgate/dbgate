import io from 'socket.io-client';
import resolveApi from './resolveApi';
import { cacheClean } from './cache';
import { shouldWaitForElectronInitialize } from './getElectron';

let socketInstance;

function recreateSocket() {
  if (shouldWaitForElectronInitialize()) return;

  socketInstance = io(resolveApi());
  socketInstance.on('clean-cache', reloadTrigger => cacheClean(reloadTrigger));
}

window['dbgate_recreateSocket'] = recreateSocket;

recreateSocket();

function socket() {
  return socketInstance;
}

export default socket;
