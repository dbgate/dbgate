import moment from 'moment';
import localforage from 'localforage';
import { getOpenedTabsStorageName } from './pageDefs';

export default async function localStorageGarbageCollector() {
  const openedTabsJson = await localforage.getItem(getOpenedTabsStorageName());
  let openedTabs = openedTabsJson ?? [];

  const closeLimit = moment().add(-7, 'day').valueOf();

  openedTabs = openedTabs.filter(x => !x.closedTime || x.closedTime > closeLimit);
  await localforage.setItem(getOpenedTabsStorageName(), openedTabs);

  const toRemove = [];
  for (const key in localStorage) {
    if (!key.startsWith('tabdata_')) continue;
    if (openedTabs.find(x => key.endsWith('_' + x.tabid))) continue;
    toRemove.push(key);
  }

  for (const key of toRemove) {
    localStorage.removeItem(key);
  }

  const keysForage = await localforage.keys();
  const toRemoveForage = [];
  for (const key in keysForage) {
    if (!key.startsWith('tabdata_')) continue;
    if (openedTabs.find(x => key.endsWith('_' + x.tabid))) continue;
    toRemoveForage.push(key);
  }

  for (const key of toRemoveForage) {
    await localforage.removeItem(key);
  }
}
