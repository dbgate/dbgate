let isAdminPageCache;

export function isAdminPage() {
  if (isAdminPageCache == null) {
    const params = new URLSearchParams(location.search);
    const urlPage = params.get('page');

    isAdminPageCache = urlPage == 'admin';
  }
  return isAdminPageCache;
}

export function getOpenedTabsStorageName() {
  return isAdminPage() ? 'adminOpenedTabs' : 'openedTabs';
}
