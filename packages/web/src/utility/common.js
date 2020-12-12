
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

export function changeTab(tabid, setOpenedTabs, changeFunc) {
  setOpenedTabs((files) => files.map((tab) => (tab.tabid == tabid ? changeFunc(tab) : tab)));
}
