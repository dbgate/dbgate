import React from 'react';
import _ from 'lodash';
import { useOpenedConnections, useCurrentDatabase } from './globalState';
import axios from './axios';

export default function ConnectionsPinger({ children }) {
  const openedConnections = useOpenedConnections();
  const currentDatabase = useCurrentDatabase();
  React.useEffect(() => {
    const handle = window.setInterval(() => {
      axios.post('server-connections/ping', { connections: openedConnections });

      const database = _.get(currentDatabase, 'name');
      const conid = _.get(currentDatabase, 'connection._id');
      if (conid && database) {
        axios.post('database-connections/ping', { conid, database });
      }
    }, 30 * 1000);
    return () => window.clearInterval(handle);
  }, [openedConnections, currentDatabase]);
  return children;
}
