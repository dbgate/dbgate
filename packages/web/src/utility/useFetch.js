import React from 'react';
import _ from 'lodash';
import axios from './axios';
import useSocket from './SocketProvider';
import stableStringify from 'json-stable-stringify';
import { getCachedPromise, cacheGet, cacheSet, cacheClean } from './cache';
import getAsArray from './getAsArray';

export default function useFetch({
  url,
  data = undefined,
  params = undefined,
  defaultValue = undefined,
  reloadTrigger = undefined,
  cacheKey = undefined,
  transform = (x) => x,
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
      return transform(resp.data);
    }

    if (cacheKey) {
      const fromCache = cacheGet(cacheKey);
      if (fromCache) {
        setValue([fromCache, loadedIndicators]);
      } else {
        try {
          const res = await getCachedPromise(cacheKey, doLoad);
          cacheSet(cacheKey, res, reloadTrigger);
          setValue([res, loadedIndicators]);
        } catch (err) {
          console.error('Error when using cached promise', err);
          cacheClean(cacheKey);
          const res = await doLoad();
          cacheSet(cacheKey, res, reloadTrigger);
          setValue([res, loadedIndicators]);
        }
      }
    } else {
      const res = await doLoad();
      setValue([res, loadedIndicators]);
    }
  }

  React.useEffect(() => {
    loadValue(indicators);
  }, [...indicators]);

  React.useEffect(() => {
    if (reloadTrigger && !socket) {
      console.error('Socket not available, reloadTrigger not planned');
    }
    if (reloadTrigger && socket) {
      for (const item of getAsArray(reloadTrigger)) {
        socket.on(item, handleReload);
      }
      return () => {
        for (const item of getAsArray(reloadTrigger)) {
          socket.off(item, handleReload);
        }
      };
    }
  }, [socket, reloadTrigger]);

  const [returnValue, loadedIndicators] = value;
  if (_.isEqual(indicators, loadedIndicators)) return returnValue;

  return defaultValue;
}
