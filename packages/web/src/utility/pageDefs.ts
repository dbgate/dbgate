export function isAdminPage() {
  return window['dbgate_page'] == 'admin';
}

export function isOneOfPage(...pages) {
  return pages.includes(window['dbgate_page']);
}

export function getOpenedTabsStorageName() {
  return isAdminPage() ? 'adminOpenedTabs' : 'openedTabs';
}
