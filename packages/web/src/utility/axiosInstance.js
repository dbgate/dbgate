import axios from 'axios';
import resolveApi, { resolveApiHeaders } from './resolveApi';

let axiosInstance;

function recreateAxiosInstance() {
  axiosInstance = axios.create({
    baseURL: resolveApi(),
  });

  axiosInstance.defaults.headers = {
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    Expires: '0',
    ...resolveApiHeaders(),
  };
}

window['dbgate_recreateAxiosInstance'] = recreateAxiosInstance;

recreateAxiosInstance();

export default axiosInstance;
