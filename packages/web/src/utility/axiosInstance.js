import axios from 'axios';
import resolveApi, { resolveApiHeaders } from './resolveApi';

let instance;

function recreateAxiosInstance() {
  instance = axios.create({
    baseURL: resolveApi(),
  });

  instance.defaults.headers = {
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    Expires: '0',
    ...resolveApiHeaders(),
  };
}

window['dbgate_recreateAxiosInstance'] = recreateAxiosInstance;

recreateAxiosInstance();

export default function axiosInstance() {
  return instance;
}
