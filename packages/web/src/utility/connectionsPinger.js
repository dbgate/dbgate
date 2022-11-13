import _ from 'lodash';
import { openedConnections, currentDatabase } from '../stores';
import { apiCall } from './api';
import { getConnectionList } from './metadataLoaders';

// const doServerPing = async value => {
//   const connectionList = getConnectionList();
//   const connections = value.filter(id => !connectionList.find(x => x._id == id)?.singleDatabase);
//   apiCall('server-connections/ping', { connections });
// };

const doServerPing = value => {
  apiCall('server-connections/ping', { connections: value });
};

const doDatabasePing = value => {
  const database = _.get(value, 'name');
  const conid = _.get(value, 'connection._id');
  if (conid && database) {
    apiCall('database-connections/ping', { conid, database });
  }
};

let openedConnectionsHandle = null;

let currentDatabaseHandle = null;

export function subscribeConnectionPingers() {
  openedConnections.subscribe(value => {
    doServerPing(value);
    if (openedConnectionsHandle) window.clearInterval(openedConnectionsHandle);
    openedConnectionsHandle = window.setInterval(() => doServerPing(value), 30_000);
  });

  currentDatabase.subscribe(value => {
    doDatabasePing(value);
    if (currentDatabaseHandle) window.clearInterval(currentDatabaseHandle);
    currentDatabaseHandle = window.setInterval(() => doDatabasePing(value), 30_000);
  });
}
