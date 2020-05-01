import React from 'react';
import { useOpenedConnections } from './globalState';
import axios from './axios';

export default function OpenedConnectionsPinger({ children }) {
  const openedConnections = useOpenedConnections();
  React.useEffect(() => {
    const handle = window.setInterval(() => {
      axios.post('server-connections/ping', { connections: openedConnections });
    }, 30 * 1000);
    return () => window.clearInterval(handle);
  }, [openedConnections]);
  return children;
}
