import React from 'react';
import _ from 'lodash';
import axios from './axios';
import useSocket from './SocketProvider';
import stableStringify from 'json-stable-stringify';
import { getCachedPromise, cacheGet, cacheSet } from './cache';

export default function useFetch({
  url,
  data = undefined,
  params = undefined,
  defaultValue = undefined,
  reloadTrigger = undefined,
  cacheKey = undefined,
  ...config
}) {
  const [value, setValue] = React.useState([defaultValue, []]);
  const [loadCounter, setLoadCounter] = React.useState(0);
  const socket = useSocket();

  const handleReload = React.useCallback(() => {
    setLoadCounter((counter) => counter + 1);
  }, []);

  const indicators = [url, stableStringify(data), stableStringify(params), loadCounter];

  async function loadValue(loadedIndicators) {
    async function doLoad() {
      const resp = await axios.request({
        method: 'get',
        params,
        url,
        data,
        ...config,
      });
      return resp.data;
    }

    if (cacheKey) {
      const fromCache = cacheGet(cacheKey);
      if (fromCache) return fromCache;
      const res = await getCachedPromise(cacheKey, doLoad);
      setValue([res, loadedIndicators]);
      cacheSet(cacheKey, res, reloadTrigger);
    } else {
      const res = await doLoad();
      setValue([res, loadedIndicators]);
    }
  }

  // React.useEffect(() => {
  //   loadValue(indicators);
  //   if (reloadTrigger && socket) {
  //     socket.on(reloadTrigger, handleReload);
  //     return () => {
  //       socket.off(reloadTrigger, handleReload);
  //     };
  //   }
  // }, [...indicators, socket]);

  React.useEffect(() => {
    loadValue(indicators);
  }, [...indicators]);

  React.useEffect(() => {
    if (reloadTrigger && socket) {
      socket.on(reloadTrigger, handleReload);
      return () => {
        socket.off(reloadTrigger, handleReload);
      };
    }
  }, [socket, reloadTrigger]);

  const [returnValue, loadedIndicators] = value;
  if (_.isEqual(indicators, loadedIndicators)) return returnValue;

  return defaultValue;
}
