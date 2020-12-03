import uuidv1 from 'uuid/v1';
import localforage from 'localforage';

export class LoadingToken {
  constructor() {
    this.isCanceled = false;
  }

  cancel() {
    this.isCanceled = true;
  }
}

export function sleep(milliseconds) {
  return new Promise((resolve) => window.setTimeout(() => resolve(null), milliseconds));
}

export async function openNewTab(setOpenedTabs, newTab, initialData = undefined) {
  const tabid = uuidv1();
  if (initialData) {
    await localforage.setItem(`tabdata_${tabid}`, initialData);
  }
  setOpenedTabs((files) => [
    ...(files || []).map((x) => ({ ...x, selected: false })),
    {
      tabid,
      selected: true,
      ...newTab,
    },
  ]);
}

export function changeTab(tabid, setOpenedTabs, changeFunc) {
  setOpenedTabs((files) => files.map((tab) => (tab.tabid == tabid ? changeFunc(tab) : tab)));
}
