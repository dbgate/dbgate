import React from 'react';
import _ from 'lodash';
import axios from './axios';
import useSocket from './SocketProvider';
import stableStringify from 'json-stable-stringify';

export default function useFetch({
  url,
  data = undefined,
  params = undefined,
  defaultValue = undefined,
  reloadTrigger = undefined,
  ...config
}) {
  const [value, setValue] = React.useState([defaultValue, []]);
  const [loadCounter, setLoadCounter] = React.useState(0);
  const socket = useSocket();

  const handleReload = () => {
    setLoadCounter(loadCounter + 1);
  };

  const indicators = [url, stableStringify(data), stableStringify(params), loadCounter];

  async function loadValue(loadedIndicators) {
    const resp = await axios.request({
      method: 'get',
      params,
      url,
      data,
      ...config,
    });
    setValue([resp.data, loadedIndicators]);
  }
  React.useEffect(() => {
    loadValue(indicators);
    if (reloadTrigger && socket) {
      socket.on(reloadTrigger, handleReload);
      return () => {
        socket.off(reloadTrigger, handleReload);
      };
    }
  }, [...indicators, socket]);

  const [returnValue, loadedIndicators] = value;
  if (_.isEqual(indicators, loadedIndicators)) return returnValue;

  return defaultValue;
}
