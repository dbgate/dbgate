import { openedTabs } from '../stores';

export class LoadingToken {
  constructor() {
    this.isCanceled = false;
  }

  cancel() {
    this.isCanceled = true;
  }
}

export function sleep(milliseconds) {
  return new Promise(resolve => window.setTimeout(() => resolve(null), milliseconds));
}

export function changeTab(tabid, setOpenedTabs, changeFunc) {
  setOpenedTabs(files => files.map(tab => (tab.tabid == tabid ? changeFunc(tab) : tab)));
}

export function setSelectedTabFunc(files, tabid) {
  return [
    ...(files || []).filter(x => x.tabid != tabid).map(x => ({ ...x, selected: false })),
    ...(files || []).filter(x => x.tabid == tabid).map(x => ({ ...x, selected: true })),
  ];
}

export function setSelectedTab(tabid) {
  openedTabs.update(tabs => setSelectedTabFunc(tabs, tabid));
}
