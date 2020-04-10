import axios from 'axios';
import resolveApi from './resolveApi';

export default axios.create({
  baseURL: resolveApi(),
});
