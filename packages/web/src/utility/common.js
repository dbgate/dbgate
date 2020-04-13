import uuidv1 from 'uuid/v1';

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

export function openNewTab(setOpenedTabs, newTab) {
  const tabid = uuidv1();
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
