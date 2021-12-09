import { writable, derived, readable } from 'svelte/store';
import { ExtensionsDirectory } from 'dbgate-types';
import invalidateCommands from './commands/invalidateCommands';
import getElectron from './utility/getElectron';
import { GlobalCommand } from './commands/registerCommand';
import { useConfig, useSettings } from './utility/metadataLoaders';
import _ from 'lodash';

interface TabDefinition {
  title: string;
  closedTime?: number;
  icon: string;
  props: any;
  selected: boolean;
  busy: boolean;
  tabid: string;
  tabComponent: string;
}

export function writableWithStorage<T>(defaultValue: T, storageName) {
  const init = localStorage.getItem(storageName);
  const res = writable<T>(init ? JSON.parse(init) : defaultValue);
  res.subscribe(value => {
    localStorage.setItem(storageName, JSON.stringify(value));
  });
  return res;
}

function subscribeCssVariable(store, transform, cssVariable) {
  store.subscribe(value => document.documentElement.style.setProperty(cssVariable, transform(value)));
}

export const selectedWidget = writableWithStorage('database', 'selectedWidget');
export const openedConnections = writable([]);
export const currentDatabase = writable(null);
export const openedTabs = writableWithStorage<TabDefinition[]>([], 'openedTabs');
export const copyRowsFormat = writableWithStorage('textWithoutHeaders', 'copyRowsFormat');
export const extensions = writable<ExtensionsDirectory>(null);
export const visibleCommandPalette = writable(null);
export const commands = writable({});
export const currentTheme = writableWithStorage('theme-light', 'currentTheme');
export const activeTabId = derived([openedTabs], ([$openedTabs]) => $openedTabs.find(x => x.selected)?.tabid);
export const activeTab = derived([openedTabs], ([$openedTabs]) => $openedTabs.find(x => x.selected));
export const recentDatabases = writableWithStorage([], 'recentDatabases');
export const pinnedDatabases = writableWithStorage([], 'pinnedDatabases');
export const pinnedTables = writableWithStorage([], 'pinnedTables');
export const commandsSettings = derived(useSettings(), (config: any) => (config || {}).commands || {});
export const allResultsInOneTabDefault = writableWithStorage(false, 'allResultsInOneTabDefault');
export const archiveFilesAsDataSheets = writableWithStorage([], 'archiveFilesAsDataSheets');
export const commandsCustomized = derived([commands, commandsSettings], ([$commands, $commandsSettings]) =>
  _.mapValues($commands, (v, k) => ({
    // @ts-ignore
    ...v,
    ...$commandsSettings[k],
  }))
);

export const visibleToolbar = writableWithStorage(true, 'visibleToolbar');
export const zoomKoef = writableWithStorage(1, 'zoomKoef');
export const leftPanelWidth = writableWithStorage(300, 'leftPanelWidth');
export const currentDropDownMenu = writable(null);
export const openedModals = writable([]);
export const openedSnackbars = writable([]);
export const nullStore = readable(null, () => {});
export const currentArchive = writableWithStorage('default', 'currentArchive');
export const isFileDragActive = writable(false);
export const selectedCellsCallback = writable(null);
export const loadingPluginStore = writable({
  loaded: false,
  loadingPackageName: null,
});

export const currentThemeDefinition = derived([currentTheme, extensions], ([$currentTheme, $extensions]) =>
  $extensions.themes.find(x => x.className == $currentTheme)
);

const electron = getElectron();

subscribeCssVariable(selectedWidget, x => (x ? 1 : 0), '--dim-visible-left-panel');
subscribeCssVariable(visibleToolbar, x => (x ? 1 : 0), '--dim-visible-toolbar');
subscribeCssVariable(leftPanelWidth, x => `${x}px`, '--dim-left-panel-width');

let activeTabIdValue = null;
activeTabId.subscribe(value => {
  activeTabIdValue = value;
  invalidateCommands();
});
export const getActiveTabId = () => activeTabIdValue;

let visibleCommandPaletteValue = null;
visibleCommandPalette.subscribe(value => {
  visibleCommandPaletteValue = value;
  invalidateCommands();
});
export const getVisibleCommandPalette = () => visibleCommandPaletteValue;

let visibleToolbarValue = null;
visibleToolbar.subscribe(value => {
  visibleToolbarValue = value;
  invalidateCommands();
});
export const getVisibleToolbar = () => visibleToolbarValue;

let zommKoefValue = null;
zoomKoef.subscribe(value => {
  zommKoefValue = value;
  document.body.style.setProperty('zoom', zommKoefValue);
});
export const getZoomKoef = () => zommKoefValue;

let openedTabsValue = null;
openedTabs.subscribe(value => {
  openedTabsValue = value;
  invalidateCommands();
});
export const getOpenedTabs = () => openedTabsValue;

let commandsValue = null;
commands.subscribe(value => {
  commandsValue = value;

  if (electron) {
    const { ipcRenderer } = electron;
    ipcRenderer.send('update-commands', JSON.stringify(value));
  }
});
export const getCommands = () => commandsValue;

let activeTabValue = null;
activeTab.subscribe(value => {
  activeTabValue = value;
});
export const getActiveTab = () => activeTabValue;

const currentConfigStore = useConfig();
let currentConfigValue = null;
currentConfigStore.subscribe(value => {
  currentConfigValue = value;
  invalidateCommands();
  if (value.singleDatabase) {
    currentDatabase.set(value.singleDatabase);
  }
});
export const getCurrentConfig = () => currentConfigValue;

let recentDatabasesValue = null;
recentDatabases.subscribe(value => {
  recentDatabasesValue = value;
});
export const getRecentDatabases = () => _.compact(recentDatabasesValue);

let pinnedDatabasesValue = null;
pinnedDatabases.subscribe(value => {
  pinnedDatabasesValue = value;
});
export const getPinnedDatabases = () => _.compact(pinnedDatabasesValue);

let currentDatabaseValue = null;
currentDatabase.subscribe(value => {
  currentDatabaseValue = value;
  invalidateCommands();
});
export const getCurrentDatabase = () => currentDatabaseValue;

let currentSettingsValue = null;
useSettings().subscribe(value => {
  currentSettingsValue = value;
  invalidateCommands();
});
export const getCurrentSettings = () => currentSettingsValue || {};

let extensionsValue = null;
extensions.subscribe(value => {
  extensionsValue = value;
});
export const getExtensions = () => extensionsValue;

let openedConnectionsValue = null;
openedConnections.subscribe(value => {
  openedConnectionsValue = value;
});
export const getOpenedConnections = () => openedConnectionsValue;
