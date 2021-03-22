import _ from 'lodash';
import axiosInstance from './axiosInstance';
import { writable } from 'svelte/store';

export default function useFetch({ url, data = undefined, params = undefined, defaultValue = undefined, ...config }) {
  const result = writable(defaultValue);

  axiosInstance
    .request({
      method: 'get',
      params,
      url,
      data,
      ...config,
    })
    .then(resp => {
      result.set(resp.data);
    });

  return result;
}
