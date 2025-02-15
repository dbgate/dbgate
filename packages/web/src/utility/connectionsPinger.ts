import _ from 'lodash';
import { currentDatabase, openedConnectionsWithTemporary, getCurrentConfig, getOpenedConnections } from '../stores';
import { apiCall, getVolatileConnections, strmid } from './api';
import hasPermission from '../utility/hasPermission';
import { getConfig } from './metadataLoaders';
import { onMount } from 'svelte';

// const doServerPing = async value => {
//   const connectionList = getConnectionList();
//   const connections = value.filter(id => !connectionList.find(x => x._id == id)?.singleDatabase);
//   apiCall('server-connections/ping', { connections });
// };

const doServerPing = value => {
  const config = getCurrentConfig();

  const conidArray = [...value];
  if (config.storageDatabase && hasPermission('internal-storage')) {
    conidArray.push('__storage');
  }
  conidArray.push(...getVolatileConnections());
  if (config.singleConnection) {
    conidArray.push(config.singleConnection._id);
  }

  apiCall('server-connections/ping', {
    conidArray: _.compact(conidArray),
    strmid,
  });
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
  openedConnectionsWithTemporary.subscribe(value => {
    doServerPing(value);
    if (openedConnectionsHandle) window.clearInterval(openedConnectionsHandle);
    openedConnectionsHandle = window.setInterval(() => doServerPing(value), 20 * 1000);
  });

  currentDatabase.subscribe(value => {
    doDatabasePing(value);
    if (currentDatabaseHandle) window.clearInterval(currentDatabaseHandle);
    currentDatabaseHandle = window.setInterval(() => doDatabasePing(value), 20 * 1000);
  });
}

export function callServerPing() {
  const connections = getOpenedConnections();
  doServerPing(connections);
}

export async function mountStorageConnectionPing() {
  const config = getCurrentConfig();

  onMount(() => {
    const conid = '__storage';
    const database = config.storageDatabase;
    apiCall('database-connections/ping', { conid, database });
    const handle = setInterval(() => {
      if (conid && database) {
        apiCall('database-connections/ping', { conid, database });
      }
    }, 20 * 1000);
    return () => clearInterval(handle);
  });
}
