import { writable, derived, readable } from 'svelte/store';
import { ExtensionsDirectory } from 'dbgate-types';
import invalidateCommands from './commands/invalidateCommands';
import getElectron from './utility/getElectron';
import { GlobalCommand } from './commands/registerCommand';
import { useConfig } from './utility/metadataLoaders';

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

export const selectedWidget = writable('database');
export const openedConnections = writable([]);
export const currentDatabase = writable(null);
export const openedTabs = writableWithStorage<TabDefinition[]>([], 'openedTabs');
export const extensions = writable<ExtensionsDirectory>(null);
export const visibleCommandPalette = writable(false);
export const commands = writable({});
export const currentTheme = writableWithStorage('theme-light', 'currentTheme');
export const activeTabId = derived([openedTabs], ([$openedTabs]) => $openedTabs.find(x => x.selected)?.tabid);
export const activeTab = derived([openedTabs], ([$openedTabs]) => $openedTabs.find(x => x.selected));

export const visibleToolbar = writableWithStorage(1, 'visibleToolbar');
export const leftPanelWidth = writable(300);
export const currentDropDownMenu = writable(null);
export const openedModals = writable([]);
export const nullStore = readable(null, () => {});
export const currentArchive = writable('default');
export const isFileDragActive = writable(false);
export const selectedCellsCallback = writable(null);

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
});
export const getCurrentConfig = () => currentConfigValue;
