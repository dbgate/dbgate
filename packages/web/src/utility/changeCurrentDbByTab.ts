import _ from 'lodash';
import {
  currentDatabase,
  focusedConnectionOrDatabase,
  getActiveTab,
  getCurrentDatabase,
  getLockedDatabaseMode,
  openedTabs,
  selectedDatabaseObjectAppObject,
} from '../stores';
import { shouldShowTab } from '../tabpanel/TabsPanel.svelte';
import { callWhenAppLoaded, getAppLoaded } from './appLoadManager';
import { getConnectionInfo } from './metadataLoaders';
import { switchCurrentDatabase } from './common';
import { extractDbNameFromComposite, isCompositeDbName } from 'dbgate-tools';

// let lastCurrentTab = null;

// openedTabs.subscribe(value => {
//   const newCurrentTab = (value || []).find(x => x.selected);
//   if (newCurrentTab == lastCurrentTab) return;
//   if (getLockedDatabaseMode() && getCurrentDatabase()) return;

//   const lastTab = lastCurrentTab;
//   lastCurrentTab = newCurrentTab;
//   // if (lastTab?.tabComponent == 'ConnectionTab') return;

//   if (newCurrentTab) {
//     const { conid, database } = newCurrentTab.props || {};
//     if (conid && database && (conid != lastTab?.props?.conid || database != lastTab?.props?.database)) {
//       const doWork = async () => {
//         const connection = await getConnectionInfo({ conid });
//         switchCurrentDatabase({
//           connection,
//           name: database,
//         });
//       };
//       callWhenAppLoaded(doWork);
//     }
//   }
// });

export async function handleAfterTabClick() {
  const currentTab = getActiveTab();
  const { conid, database, objectTypeField, pureName, schemaName, defaultActionId } = currentTab?.props || {};
  const db = getCurrentDatabase();
  if (conid && database && (conid != db?.connection?._id || database != db?.name)) {
    const connection = await getConnectionInfo({ conid });
    switchCurrentDatabase({
      connection,
      name: database,
    });
    // const doWork = async () => {
    //   const connection = await getConnectionInfo({ conid });
    //   switchCurrentDatabase({
    //     connection,
    //     name: database,
    //   });
    // };
    // callWhenAppLoaded(doWork);
  }

  if (conid && database && objectTypeField && pureName && defaultActionId) {
    selectedDatabaseObjectAppObject.set({
      conid,
      database,
      objectTypeField,
      pureName,
      schemaName,
    });
  }

  // focus current tab
  openedTabs.update(tabs => {
    return tabs.map(tab => ({
      ...tab,
      focused: !!tab.selected && !tab.closedTime,
    }));
  });
}

currentDatabase.subscribe(currentDb => {
  if (currentDb) {
    focusedConnectionOrDatabase.set({
      conid: currentDb.connection?._id,
      database:
        currentDb.connection?.useSeparateSchemas && isCompositeDbName(currentDb.name)
          ? extractDbNameFromComposite(currentDb.name)
          : currentDb.name,
      connection: currentDb.connection,
    });
  } else {
    focusedConnectionOrDatabase.set(null);
  }

  if (!getLockedDatabaseMode()) return;
  if (!currentDb && !getAppLoaded()) return;
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
