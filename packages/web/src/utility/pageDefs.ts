export function isAdminPage() {
  return window['dbgate_page'] == 'admin';
}

export function getOpenedTabsStorageName() {
  return isAdminPage() ? 'adminOpenedTabs' : 'openedTabs';
}
