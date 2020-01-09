import React from 'react';
import axios from './axios';
import useSocket from './SocketProvider';

export default function useFetch({ url, defaultValue = undefined, reloadTrigger = undefined, ...config }) {
  const [value, setValue] = React.useState(defaultValue);
  const [loadCounter, setLoadCounter] = React.useState(0);
  const socket = useSocket();

  const handleReload = () => {
    setLoadCounter(loadCounter + 1);
  };

  async function loadValue() {
    const resp = await axios.request({
      method: 'get',
      url,
      ...config,
    });
    setValue(resp.data);
  }
  React.useEffect(() => {
    loadValue();
    if (reloadTrigger && socket) {
      socket.on(reloadTrigger, handleReload);
      return () => {
        socket.off(reloadTrigger, handleReload);
      };
    }
  }, [url, socket, loadCounter]);

  return value;
}
