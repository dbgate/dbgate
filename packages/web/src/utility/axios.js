import axios from 'axios';
import resolveApi from './resolveApi';

const axiosInstance = axios.create({
  baseURL: resolveApi(),
});

axiosInstance.defaults.headers = {
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  Expires: '0',
};

export default axiosInstance;
