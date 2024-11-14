import _ from 'lodash';
import { loadCachedValue, subscribeCacheChange, unsubscribeCacheChange } from './cache';
import stableStringify from 'json-stable-stringify';
import { derived } from 'svelte/store';
import { extendDatabaseInfo } from 'dbgate-tools';
import { setLocalStorage } from '../utility/storageCache';
import { apiCall, apiOff, apiOn } from './api';

const databaseInfoLoader = ({ conid, database, modelTransFile }) => ({
  url: 'database-connections/structure',
  params: { conid, database, modelTransFile },
  reloadTrigger: { key: `database-structure-changed`, conid, database },
  transform: extendDatabaseInfo,
});

const schemaListLoader = ({ conid, database }) => ({
  url: 'database-connections/schema-list',
  params: { conid, database },
  reloadTrigger: { key: `schema-list-changed`, conid, database },
});

// const tableInfoLoader = ({ conid, database, schemaName, pureName }) => ({
//   url: 'metadata/table-info',
//   params: { conid, database, schemaName, pureName },
//   reloadTrigger: `database-structure-changed-${conid}-${database}`,
// });

// const sqlObjectInfoLoader = ({ objectTypeField, conid, database, schemaName, pureName }) => ({
//   url: 'metadata/sql-object-info',
//   params: { objectTypeField, conid, database, schemaName, pureName },
//   reloadTrigger: `database-structure-changed-${conid}-${database}`,
// });

const connectionInfoLoader = ({ conid }) => ({
  url: 'connections/get',
  params: { conid },
  reloadTrigger: { key: 'connection-list-changed' },
});

const configLoader = () => ({
  url: 'config/get',
  params: {},
  reloadTrigger: { key: 'config-changed' },
});

const settingsLoader = () => ({
  url: 'config/get-settings',
  params: {},
  reloadTrigger: { key: 'settings-changed' },
});

const platformInfoLoader = () => ({
  url: 'config/platform-info',
  params: {},
  reloadTrigger: { key: 'platform-info-changed' },
});

const favoritesLoader = () => ({
  url: 'files/favorites',
  params: {},
  reloadTrigger: { key: 'files-changed-favorites' },
});

// const sqlObjectListLoader = ({ conid, database }) => ({
//   url: 'metadata/list-objects',
//   params: { conid, database },
//   reloadTrigger: `database-structure-changed-${conid}-${database}`,
// });

const databaseStatusLoader = ({ conid, database }) => ({
  url: 'database-connections/status',
  params: { conid, database },
  reloadTrigger: { key: `database-status-changed`, conid, database },
});

const databaseListLoader = ({ conid }) => ({
  url: 'server-connections/list-databases',
  params: { conid },
  reloadTrigger: { key: `database-list-changed`, conid },
  onLoaded: value => {
    if (value?.length > 0) setLocalStorage(`database_list_${conid}`, value);
  },
  errorValue: [],
});

// const databaseKeysLoader = ({ conid, database, root }) => ({
//   url: 'database-connections/load-keys',
//   params: { conid, database, root },
//   reloadTrigger: `database-keys-changed-${conid}-${database}`,
// });

const serverVersionLoader = ({ conid }) => ({
  url: 'server-connections/version',
  params: { conid },
  reloadTrigger: { key: `server-version-changed`, conid },
});

const databaseServerVersionLoader = ({ conid, database }) => ({
  url: 'database-connections/server-version',
  params: { conid, database },
  reloadTrigger: { key: `database-server-version-changed`, conid, database },
});

const archiveFoldersLoader = () => ({
  url: 'archive/folders',
  params: {},
  reloadTrigger: { key: `archive-folders-changed` },
});

const archiveFilesLoader = ({ folder }) => ({
  url: 'archive/files',
  params: { folder },
  reloadTrigger: { key: `archive-files-changed`, folder },
});

const appFoldersLoader = () => ({
  url: 'apps/folders',
  params: {},
  reloadTrigger: { key: `app-folders-changed` },
});

const appFilesLoader = ({ folder }) => ({
  url: 'apps/files',
  params: { folder },
  reloadTrigger: { key: `app-files-changed`, app: folder },
});

// const dbAppsLoader = ({ conid, database }) => ({
//   url: 'apps/get-apps-for-db',
//   params: { conid, database },
//   reloadTrigger: `db-apps-changed-${conid}-${database}`,
// });

const usedAppsLoader = ({ conid, database }) => ({
  url: 'apps/get-used-apps',
  params: {},
  reloadTrigger: { key: `used-apps-changed` },
});

const serverStatusLoader = () => ({
  url: 'server-connections/server-status',
  params: {},
  reloadTrigger: { key: `server-status-changed` },
});

const connectionListLoader = () => ({
  url: 'connections/list',
  params: {},
  reloadTrigger: { key: `connection-list-changed` },
});

const installedPluginsLoader = () => ({
  url: 'plugins/installed',
  params: {},
  reloadTrigger: { key: `installed-plugins-changed` },
});

const filesLoader = ({ folder }) => ({
  url: 'files/list',
  params: { folder },
  reloadTrigger: { key: `files-changed`, folder },
});
const allFilesLoader = () => ({
  url: 'files/list-all',
  params: {},
  reloadTrigger: { key: `all-files-changed` },
});
const authTypesLoader = ({ engine }) => ({
  url: 'plugins/auth-types',
  params: { engine },
  reloadTrigger: { key: `installed-plugins-changed` },
  errorValue: null,
});

async function getCore(loader, args) {
  const { url, params, reloadTrigger, transform, onLoaded, errorValue } = loader(args);
  const key = stableStringify({ url, ...params });

  async function doLoad() {
    const resp = await apiCall(url, params);
    if (resp?.errorMessage && errorValue !== undefined) {
      if (onLoaded) onLoaded(errorValue);
      return errorValue;
    }
    const res = (transform || (x => x))(resp);
    if (onLoaded) onLoaded(res);
    return res;
  }

  const res = await loadCachedValue(reloadTrigger, key, doLoad);
  return res;
}

function useCore(loader, args) {
  const { url, params, reloadTrigger, transform, onLoaded } = loader(args);
  const cacheKey = stableStringify({ url, ...params });
  let openedCount = 0;

  return {
    subscribe: onChange => {
      async function handleReload() {
        const res = await getCore(loader, args);
        if (openedCount > 0) {
          onChange(res);
        }
      }
      openedCount += 1;
      handleReload();

      if (reloadTrigger) {
        subscribeCacheChange(reloadTrigger, cacheKey, handleReload);
        return () => {
          openedCount -= 1;
          unsubscribeCacheChange(reloadTrigger, cacheKey, handleReload);
        };
      } else {
        return () => {
          openedCount -= 1;
        };
      }
    },
  };
}

/** @returns {Promise<import('dbgate-types').DatabaseInfo>} */
export function getDatabaseInfo(args) {
  return getCore(databaseInfoLoader, args);
}

/** @returns {import('dbgate-types').DatabaseInfo} */
export function useDatabaseInfo(args) {
  return useCore(databaseInfoLoader, args);
}

export async function getDbCore(args, objectTypeField = undefined) {
  const db = await getDatabaseInfo(args);
  if (!db) return null;
  return db[objectTypeField || args.objectTypeField].find(
    x => x.pureName == args.pureName && x.schemaName == args.schemaName
  );
}

export function useDbCore(args, objectTypeField = undefined) {
  const dbStore = useDatabaseInfo(args);
  if (!dbStore) return null;
  return derived(dbStore, db => {
    if (!db) return null;
    if (_.isArray(objectTypeField)) {
      for (const field of objectTypeField) {
        const res = db[field || args.objectTypeField].find(
          x => x.pureName == args.pureName && x.schemaName == args.schemaName
        );
        if (res) return res;
      }
    } else {
      return db[objectTypeField || args.objectTypeField].find(
        x => x.pureName == args.pureName && x.schemaName == args.schemaName
      );
    }
  });
}

/** @returns {Promise<import('dbgate-types').TableInfo>} */
export function getTableInfo(args) {
  return getDbCore(args, 'tables');
}

/** @returns {import('dbgate-types').TableInfo} */
export function useTableInfo(args) {
  return useDbCore(args, 'tables');
}

/** @returns {Promise<import('dbgate-types').ViewInfo>} */
export function getViewInfo(args) {
  return getDbCore(args, 'views');
}

/** @returns {import('dbgate-types').ViewInfo} */
export function useViewInfo(args) {
  return useDbCore(args, ['views', 'matviews']);
}

/** @returns {import('dbgate-types').CollectionInfo} */
export function useCollectionInfo(args) {
  return useDbCore(args, 'collections');
}

export function getSqlObjectInfo(args) {
  return getDbCore(args);
}

export function useSqlObjectInfo(args) {
  return useDbCore(args);
}

/** @returns {Promise<import('dbgate-types').StoredConnection>} */
export function getConnectionInfo(args) {
  return getCore(connectionInfoLoader, args);
}

/** @returns {import('dbgate-types').StoredConnection} */
export function useConnectionInfo(args) {
  return useCore(connectionInfoLoader, args);
}

// export function getSqlObjectList(args) {
//   return getCore(sqlObjectListLoader, args);
// }
// export function useSqlObjectList(args) {
//   return useCore(sqlObjectListLoader, args);
// }

export function getDatabaseStatus(args) {
  return getCore(databaseStatusLoader, args);
}
export function useDatabaseStatus(args) {
  return useCore(databaseStatusLoader, args);
}

export function getDatabaseList(args) {
  return getCore(databaseListLoader, args);
}
export function useDatabaseList(args) {
  return useCore(databaseListLoader, args);
}

export function getServerVersion(args) {
  return getCore(serverVersionLoader, args);
}
export function useServerVersion(args) {
  return useCore(serverVersionLoader, args);
}

export function getDatabaseServerVersion(args) {
  return getCore(databaseServerVersionLoader, args);
}
export function useDatabaseServerVersion(args) {
  return useCore(databaseServerVersionLoader, args);
}

export function getServerStatus() {
  return getCore(serverStatusLoader, {});
}
export function useServerStatus() {
  return useCore(serverStatusLoader, {});
}

export function getConnectionList() {
  return getCore(connectionListLoader, {});
}
export function useConnectionList() {
  return useCore(connectionListLoader, {});
}

export function getConfig() {
  return getCore(configLoader, {});
}
export function useConfig() {
  return useCore(configLoader, {});
}

export function getSettings() {
  return getCore(settingsLoader, {});
}
export function useSettings() {
  return useCore(settingsLoader, {});
}

export function getPlatformInfo() {
  return getCore(platformInfoLoader, {});
}
export function usePlatformInfo() {
  return useCore(platformInfoLoader, {});
}

export function getArchiveFiles(args) {
  return getCore(archiveFilesLoader, args);
}
export function useArchiveFiles(args) {
  return useCore(archiveFilesLoader, args);
}

export function getArchiveFolders(args = {}) {
  return getCore(archiveFoldersLoader, args);
}
export function useArchiveFolders(args = {}) {
  return useCore(archiveFoldersLoader, args);
}

export function getAppFiles(args) {
  return getCore(appFilesLoader, args);
}
export function useAppFiles(args) {
  return useCore(appFilesLoader, args);
}

export function getAppFolders(args = {}) {
  return getCore(appFoldersLoader, args);
}
export function useAppFolders(args = {}) {
  return useCore(appFoldersLoader, args);
}

export function getUsedApps(args = {}) {
  return getCore(usedAppsLoader, args);
}
export function useUsedApps(args = {}) {
  return useCore(usedAppsLoader, args);
}

// export function getDbApps(args = {}) {
//   return getCore(dbAppsLoader, args);
// }
// export function useDbApps(args = {}) {
//   return useCore(dbAppsLoader, args);
// }

export function getInstalledPlugins(args = {}) {
  return getCore(installedPluginsLoader, args) || [];
}
export function useInstalledPlugins(args = {}) {
  return useCore(installedPluginsLoader, args);
}

export function getFiles(args) {
  return getCore(filesLoader, args);
}
export function useFiles(args) {
  return useCore(filesLoader, args);
}

export function getAllFiles(args) {
  return getCore(allFilesLoader, args);
}
export function useAllFiles(args) {
  return useCore(allFilesLoader, args);
}

export function getFavorites(args) {
  return getCore(favoritesLoader, args);
}
export function useFavorites(args = {}) {
  return useCore(favoritesLoader, args);
}

export function getAuthTypes(args) {
  return getCore(authTypesLoader, args);
}
export function useAuthTypes(args) {
  return useCore(authTypesLoader, args);
}

// export function getDatabaseKeys(args) {
//   return getCore(databaseKeysLoader, args);
// }
// export function useDatabaseKeys(args) {
//   return useCore(databaseKeysLoader, args);
// }
export function getSchemaList(args) {
  return getCore(schemaListLoader, args);
}
export function useSchemaList(args) {
  return useCore(schemaListLoader, args);
}
