import moment from 'moment';

export default function localStorageGarbageCollector() {
  const openedTabsJson = localStorage.getItem('openedTabs');
  const savedSqlFilesJson = localStorage.getItem('savedSqlFiles');
  let openedTabs = openedTabsJson ? JSON.parse(openedTabsJson) : [];

  const closeLimit = moment().add(-7, 'day').valueOf();

  openedTabs = openedTabs.filter((x) => !x.closedTime || x.closedTime > closeLimit);
  localStorage.setItem('openedTabs', JSON.stringify(openedTabs));

  const savedSqlFiles = savedSqlFilesJson ? JSON.parse(savedSqlFilesJson) : [];
  const toRemove = [];
  for (const key in localStorage) {
    if (!key.startsWith('tabdata_')) continue;
    if (savedSqlFiles.find((x) => x.storageKey == key)) continue;
    if (openedTabs.find((x) => key.endsWith('_' + x.tabid))) continue;
    toRemove.push(key);
  }

  for (const key of toRemove) {
    localStorage.removeItem(key);
  }
}
