import _ from 'lodash';
import { currentDatabase, getCurrentDatabase, getSingleDatabaseMode, openedTabs } from '../stores';
import { shouldShowTab } from '../widgets/TabsPanel.svelte';
import { callWhenAppLoaded } from './appLoadManager';
import { getConnectionInfo } from './metadataLoaders';

let lastCurrentTab = null;

openedTabs.subscribe(value => {
  const newCurrentTab = (value || []).find(x => x.selected);
  if (newCurrentTab == lastCurrentTab) return;
  if (getSingleDatabaseMode() && getCurrentDatabase()) return;

  const lastTab = lastCurrentTab;
  lastCurrentTab = newCurrentTab;
  // if (lastTab?.tabComponent == 'ConnectionTab') return;

  if (newCurrentTab) {
    const { conid, database } = newCurrentTab.props || {};
    if (conid && database && (conid != lastTab?.props?.conid || database != lastTab?.props?.database)) {
      const doWork = async () => {
        const connection = await getConnectionInfo({ conid });
        currentDatabase.set({
          connection,
          name: database,
        });
      };
      callWhenAppLoaded(doWork);
    }
  }
});

currentDatabase.subscribe(currentDb => {
  if (!getSingleDatabaseMode()) return;
  openedTabs.update(tabs => {
    const newTabs = tabs.map(tab => ({
      ...tab,
      selected: tab.selected && shouldShowTab(tab, true, currentDb),
    }));

    if (newTabs.find(x => x.selected)) return newTabs;

    const selectedIndex = _.findLastIndex(newTabs, x => shouldShowTab(x));

    return newTabs.map((x, index) => ({
      ...x,
      selected: index == selectedIndex,
    }));
  });
});
