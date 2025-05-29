import { derived } from 'svelte/store';
import {
  cloudConnectionsStore,
  currentDatabase,
  getCloudConnectionsStore,
  openedConnections,
  openedSingleDatabaseConnections,
} from '../stores';
import { apiCall, apiOn } from './api';
import _ from 'lodash';

export const possibleCloudConnectionSources = derived(
  [currentDatabase, openedSingleDatabaseConnections, openedConnections],
  ([$currentDatabase, $openedSingleDatabaseConnections, $openedConnections]) => {
    const conids = new Set<string>();
    if ($currentDatabase?.connection?._id) {
      conids.add($currentDatabase.connection._id);
    }
    $openedSingleDatabaseConnections.forEach(x => conids.add(x));
    $openedConnections.forEach(x => conids.add(x));
    return Array.from(conids).filter(x => x?.startsWith('cloud://'));
  }
);

async function loadCloudConnection(conid) {
  const conn = await apiCall('connections/get', { conid });
  cloudConnectionsStore.update(store => ({
    ...store,
    [conid]: conn,
  }));
}

function ensureCloudConnectionsLoaded(...conids) {
  const conns = getCloudConnectionsStore();

  cloudConnectionsStore.update(store => _.pick(store, conids));

  conids.forEach(conid => {
    if (!conns[conid]) {
      loadCloudConnection(conid);
    }
  });
}

export function installCloudListeners() {
  possibleCloudConnectionSources.subscribe(conids => {
    ensureCloudConnectionsLoaded(...conids);
  });

  apiOn('cloud-content-updated', () => {
    const conids = Object.keys(getCloudConnectionsStore());
    cloudConnectionsStore.set({});
    for (const conn of conids) {
      loadCloudConnection(conn);
    }
  });
}
