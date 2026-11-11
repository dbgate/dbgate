// Browser storage (localStorage, IndexedDB via localforage) is shared by everything on one origin.
// When DbGate runs under WEB_ROOT, several instances can live on the same origin
// (https://host/a/, https://host/b/), so their keys would collide. The server then injects
// window.dbgate_webRoot into the HTML page and all keys of this instance are prefixed with it.
// Without WEB_ROOT, the prefix is empty and storage stays exactly as before.

import localforage from 'localforage';

const LEGACY_FORAGE_NAME = 'localforage';
const MIGRATION_MARKER_KEY = '__storageMigrated';

function readWebRoot(): string {
  try {
    const value = window['dbgate_webRoot'];
    if (typeof value != 'string') return '';
    const root = value.replace(/^\/*/, '').replace(/\/*$/, '');
    return root ? `/${root}` : '';
  } catch {
    return '';
  }
}

export const storageWebRoot = readWebRoot();

// e.g. '/my-instance/' - DbGate's own keys never start with '/', so prefixed keys can't clash with them.
// The root is encoded ('/dbgate/prod' => '/dbgate%2Fprod/'), so the prefix of a nested root
// never starts with the prefix of its parent ('/dbgate/').
// Keep in sync with the inline script in index.html.tpl
export const storagePrefix = storageWebRoot ? `/${encodeURIComponent(storageWebRoot.substring(1))}/` : '';

if (storagePrefix) {
  // must run before any other localforage call, that's why this module is imported first in main.ts
  localforage.config({ name: `${LEGACY_FORAGE_NAME}${storageWebRoot}` });
}

function belongsToThisInstance(rawKey: string) {
  if (storagePrefix) return rawKey.startsWith(storagePrefix);
  // keys of instances running under WEB_ROOT
  return !rawKey.startsWith('/');
}

export const appLocalStorage = {
  getItem(key: string): string | null {
    return localStorage.getItem(storagePrefix + key);
  },
  setItem(key: string, value: string) {
    localStorage.setItem(storagePrefix + key, value);
  },
  removeItem(key: string) {
    localStorage.removeItem(storagePrefix + key);
  },
  /** keys of this instance, without prefix */
  keys(): string[] {
    const res = [];
    for (let i = 0; i < localStorage.length; i++) {
      const rawKey = localStorage.key(i);
      if (rawKey != null && belongsToThisInstance(rawKey)) {
        res.push(rawKey.substring(storagePrefix.length));
      }
    }
    return res;
  },
  /** removes all keys of this instance (keys of instances running under WEB_ROOT are kept) */
  clear() {
    for (const key of this.keys()) {
      this.removeItem(key);
    }
  },
};

// ---------------- migration of data stored before the prefix was introduced ----------------
// Data are moved (not copied): with several instances on one origin, only the first opened one
// takes over the old tabs and settings, the others start empty.

const LEGACY_LOCAL_STORAGE_PREFIXES = ['tabdata_', 'database_list_', 'selected-schema-'];

const LEGACY_LOCAL_STORAGE_KEYS = new Set([
  'accessToken',
  'adminAccessToken',
  'dbloginState',
  'appVersion',
  'lastDbGateCrash',
  'selectedLanguage',
  'currentThemeType',
  'currentThemeDefinition',
  'currentEditorTheme',
  'currentEditorKeybindigMode',
  'currentEditorWrapEnabled',
  'currentEditorFontSize',
  'selectedWidget',
  'selectedAdminWidget',
  'lockedDatabaseMode',
  'visibleWidgetSideBar',
  'emptyConnectionGroupNames',
  'collapsedConnectionGroupNames',
  'currentDatabase',
  'copyRowsFormat',
  'rightPanelWidget',
  'recentDatabases',
  'pinnedDatabases',
  'pinnedTables',
  'allResultsInOneTabDefault',
  'leftPanelWidth',
  'rightPanelWidth',
  'currentArchive',
  'currentApplication',
  'activeRedisKeysStore',
  'lastUsedDefaultActions',
  'seenPremiumPromoWidget',
  'databaseObjectAppObjectSearchSettings2',
  'connectionAppObjectSearchSettings2',
  'serverSummary.selectedTab',
  'tabGroup.showServerName',
  'settings.toolbarPosition',
  'dbgateUsageAnalytics',
  'dbgateUsageAnalyticsConsent',
  'dbgateUsageAnalyticsTrace',
  'collection_collapsedLeftColumn',
  'dataGrid_collapsedLeftColumn',
  'dataGridCellDataFormNotNull',
  'dataGridCellViewWidth',
  'dataGridManagerWidth',
  'graphQlCellViewWidth',
  'perspectiveManagerWidth',
  'archiveWidget',
  'databaseWidget',
  'filesWidget',
  'historyWidget',
  'openedTabsWidget',
  'pluginsWidget',
  'privateCloudItems',
  'publicCloudItems',
  'dbCompareSettingsWidget',
  'diagramSettingsWidget',
  // stored in localStorage by older versions, now in localforage
  'openedTabs',
  'adminOpenedTabs',
]);

const LEGACY_FORAGE_PREFIXES = ['tabdata_'];
const LEGACY_FORAGE_KEYS = new Set(['openedTabs', 'adminOpenedTabs']);

function isLegacyLocalStorageKey(key: string) {
  return LEGACY_LOCAL_STORAGE_KEYS.has(key) || LEGACY_LOCAL_STORAGE_PREFIXES.some(x => key.startsWith(x));
}

function isLegacyForageKey(key: string) {
  return LEGACY_FORAGE_KEYS.has(key) || LEGACY_FORAGE_PREFIXES.some(x => key.startsWith(x));
}

function migrateLocalStorage() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key != null && isLegacyLocalStorageKey(key)) keys.push(key);
  }
  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value != null && appLocalStorage.getItem(key) == null) {
      appLocalStorage.setItem(key, value);
    }
    localStorage.removeItem(key);
  }
}

// Web Locks are per origin, so a tab of another WEB_ROOT instance waits until this one finishes
// and then finds no legacy keys left. Not available outside secure contexts (plain http on a non-localhost host).
function withMigrationLock(callback: () => Promise<void>): Promise<void> {
  const locks = typeof navigator != 'undefined' ? navigator['locks'] : null;
  if (!locks?.request) return callback();
  return locks.request('dbgate-legacy-storage-migration', callback);
}

async function migrateForage() {
  const legacy = localforage.createInstance({ name: LEGACY_FORAGE_NAME });
  const keys = (await legacy.keys()).filter(isLegacyForageKey);
  for (const key of keys) {
    const value = await legacy.getItem(key);
    if (value != null) {
      const current = await localforage.getItem(key);
      if (LEGACY_FORAGE_KEYS.has(key)) {
        // opened tabs could already exist here, when a previous migration attempt failed
        // (eg. the garbage collector stores an empty list) - merge them, so no tab is lost
        await localforage.setItem(key, mergeOpenedTabs(current, value));
      } else if (current == null) {
        await localforage.setItem(key, value);
      }
    }
    await legacy.removeItem(key);
  }
}

function mergeOpenedTabs(current, legacy) {
  if (!Array.isArray(legacy)) return current ?? legacy;
  if (!Array.isArray(current) || current.length == 0) return legacy;
  const existingIds = new Set(current.map(tab => tab?.tabid));
  return [...current, ...legacy.filter(tab => !existingIds.has(tab?.tabid)).map(tab => ({ ...tab, selected: false }))];
}

async function migrateLegacyStorage() {
  if (!storagePrefix) return;
  if (appLocalStorage.getItem(MIGRATION_MARKER_KEY)) return;
  try {
    // synchronous, so it can't wait for a lock; stores read localStorage right after this module loads.
    // Tabs of two instances opened at the very same moment could both get some legacy keys - nothing is lost.
    migrateLocalStorage();
    await withMigrationLock(migrateForage);
  } catch (err) {
    // marker is not set, so the migration is retried on next startup
    // (already moved keys are no longer in the legacy storage, existing prefixed values are not overwritten)
    console.error('DBGM-00000 Error migrating browser storage to WEB_ROOT prefix', err);
    return;
  }
  appLocalStorage.setItem(MIGRATION_MARKER_KEY, '1');
}

// localStorage part of the migration runs synchronously, before any store reads it.
// Code reading localforage on startup must wait for this promise.
export const appStorageReady: Promise<void> = migrateLegacyStorage();
