import io from 'socket.io-client';
import resolveApi from './resolveApi';
import { cacheClean } from './cache';

const socket = io(resolveApi());
socket.on('clean-cache', reloadTrigger => cacheClean(reloadTrigger));

export default socket;
