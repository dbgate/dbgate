<script lang="ts" context="module">
  const closeTabFunc = closeCondition => tabid => {
    openedTabs.update(files => {
      const active = files.find(x => x.tabid == tabid);
      if (!active) return files;

      const newFiles = files.map(x => ({
        ...x,
        closedTime: x.closedTime || (closeCondition(x, active) ? new Date().getTime() : undefined),
      }));

      if (newFiles.find(x => x.selected && x.closedTime == null)) {
        return newFiles;
      }

      const selectedIndex = _.findLastIndex(newFiles, x => x.closedTime == null);

      return newFiles.map((x, index) => ({
        ...x,
        selected: index == selectedIndex,
      }));
    });
  };

  const closeTab = closeTabFunc((x, active) => x.tabid == active.tabid);
  const closeAll = () => {
    const closedTime = new Date().getTime();
    openedTabs.update(tabs =>
      tabs.map(tab => ({
        ...tab,
        closedTime: tab.closedTime || closedTime,
        selected: false,
      }))
    );
  };
  const closeCurrentTab = () => {
    closeTab(getActiveTabId());
  };
  const closeWithSameDb = closeTabFunc(
    (x, active) =>
      _.get(x, 'props.conid') == _.get(active, 'props.conid') &&
      _.get(x, 'props.database') == _.get(active, 'props.database')
  );
  const closeWithOtherDb = closeTabFunc(
    (x, active) =>
      _.get(x, 'props.conid') != _.get(active, 'props.conid') ||
      _.get(x, 'props.database') != _.get(active, 'props.database')
  );
  const closeOthers = closeTabFunc((x, active) => x.tabid != active.tabid);

  function getTabDbName(tab, connectionList) {
    if (tab.props && tab.props.conid && tab.props.database) return tab.props.database;
    if (tab.props && tab.props.conid) {
      const connection = connectionList?.find(x => x._id == tab.props.conid);
      if (connection) return getConnectionLabel(connection, { allowExplicitDatabase: false });
      return '???';
    }
    if (tab.props && tab.props.archiveFolder) return tab.props.archiveFolder;
    return '(no DB)';
  }

  function getDbIcon(key) {
    if (key.startsWith('database://')) return 'icon database';
    if (key.startsWith('archive://')) return 'icon archive';
    if (key.startsWith('server://')) return 'icon server';
    return 'icon file';
  }

  function sortTabs(tabs) {
    return _.sortBy(tabs, [x => x['tabOrder'] || 0, 'title', 'tabid']);
  }

  registerCommand({
    id: 'tabs.nextTab',
    category: 'Tabs',
    name: 'Next tab',
    keyText: 'Ctrl+Tab',
    testEnabled: () => getOpenedTabs().filter(x => !x.closedTime).length >= 2,
    onClick: () => {
      const tabs = get(openedTabs).filter(x => x.closedTime == null);
      if (tabs.length >= 2) setSelectedTab(tabs[tabs.length - 2].tabid);
    },
  });

  registerCommand({
    id: 'tabs.closeAll',
    category: 'Tabs',
    name: 'Close all tabs',
    testEnabled: () => getOpenedTabs().filter(x => !x.closedTime).length >= 1,
    onClick: closeAll,
  });

  registerCommand({
    id: 'tabs.closeTab',
    category: 'Tabs',
    name: 'Close tab',
    keyText: isElectronAvailable() ? 'Ctrl+W' : null,
    testEnabled: () => getOpenedTabs().filter(x => !x.closedTime).length >= 1,
    onClick: closeCurrentTab,
  });

  registerCommand({
    id: 'tabs.addToFavorites',
    category: 'Tabs',
    name: 'Add current tab to favorites',
    // icon: 'icon favorite',
    // toolbar: true,
    testEnabled: () =>
      getActiveTab()?.tabComponent &&
      tabs[getActiveTab()?.tabComponent] &&
      tabs[getActiveTab()?.tabComponent].allowAddToFavorites &&
      tabs[getActiveTab()?.tabComponent].allowAddToFavorites(getActiveTab()?.props),
    onClick: () => showModal(FavoriteModal, { savingTab: getActiveTab() }),
  });
</script>

<script lang="ts">
  import { LogarithmicScale } from 'chart.js';
  import _, { map, slice, sortBy } from 'lodash';
  import { tick } from 'svelte';
  import { derived, get } from 'svelte/store';
  import registerCommand from '../commands/registerCommand';
  import FontIcon from '../icons/FontIcon.svelte';
  import FavoriteModal from '../modals/FavoriteModal.svelte';
  import { showModal } from '../modals/modalTools';

  import {
    currentDatabase,
    getActiveTab,
    getOpenedTabs,
    openedTabs,
    activeTabId,
    getActiveTabId,
    tabDatabaseGroupOrder,
  } from '../stores';
  import tabs from '../tabs';
  import { setSelectedTab } from '../utility/common';
  import contextMenu from '../utility/contextMenu';
  import getConnectionLabel from '../utility/getConnectionLabel';
  import { isElectronAvailable } from '../utility/getElectron';
  import { getConnectionInfo, useConnectionList } from '../utility/metadataLoaders';
  import { duplicateTab, getTabDbKey } from '../utility/openNewTab';
  import { useConnectionColorFactory } from '../utility/useConnectionColor';

  $: connectionList = useConnectionList();

  $: currentDbKey =
    $currentDatabase && $currentDatabase.name && $currentDatabase.connection
      ? `database://${$currentDatabase.name}-${$currentDatabase.connection._id}`
      : $currentDatabase && $currentDatabase.connection
      ? `server://${$currentDatabase.connection._id}`
      : '_no';

  $: tabsWithDb = $openedTabs
    .filter(x => !x.closedTime)
    .map(tab => ({
      ...tab,
      tabDbName: getTabDbName(tab, $connectionList),
      tabDbKey: getTabDbKey(tab),
    }));

  $: tabsByDb = _.groupBy(tabsWithDb, 'tabDbKey');
  $: dbKeys = _.sortBy(_.keys(tabsByDb), [x => $tabDatabaseGroupOrder[x] || 0, x => x]);

  $: scrollInViewTab($activeTabId);

  let draggingTab = null;
  let draggingDbKey = null;

  const connectionColorFactory = useConnectionColorFactory(3, null, true);

  const handleTabClick = (e, tabid) => {
    if (e.target.closest('.tabCloseButton')) {
      return;
    }
    setSelectedTab(tabid);
  };

  const handleMouseUp = (e, tabid) => {
    if (e.button == 1) {
      e.preventDefault();
      closeTab(tabid);
    }
  };

  const getContextMenu = tab => () => {
    const { tabid, props, tabComponent } = tab;

    return [
      {
        text: 'Close',
        onClick: () => closeTab(tabid),
      },
      {
        text: 'Close all',
        onClick: closeAll,
      },
      {
        text: 'Close others',
        onClick: () => closeOthers(tabid),
      },
      {
        text: 'Duplicate',
        onClick: () => duplicateTab(tab),
      },
      tabComponent &&
        tabs[tabComponent] &&
        tabs[tabComponent].allowAddToFavorites &&
        tabs[tabComponent].allowAddToFavorites(props) && [
          { divider: true },
          {
            text: 'Add to favorites',
            onClick: () => showModal(FavoriteModal, { savingTab: tab }),
          },
        ],
    ];
  };

  function getDatabaseContextMenu(tabs) {
    const { tabid, props } = tabs[0];
    const { conid, database } = props || {};

    return [
      conid &&
        database && [
          {
            text: `Close tabs with DB ${database}`,
            onClick: () => closeWithSameDb(tabid),
          },
          {
            text: `Close tabs with other DB than ${database}`,
            onClick: () => closeWithOtherDb(tabid),
          },
        ],
    ];
  }

  const handleSetDb = async props => {
    const { conid, database } = props || {};
    if (conid) {
      const connection = await getConnectionInfo({ conid, database });
      if (connection) {
        $currentDatabase = { connection, name: database };
        return;
      }
    }
    $currentDatabase = null;
  };

  async function scrollInViewTab(tabid) {
    await tick();
    const element = document.getElementById(`file-tab-item-${tabid}`);
    if (element) {
      element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }
</script>

{#each dbKeys as dbKey}
  <div class="db-wrapper">
    <div
      class="db-name"
      class:selected={tabsByDb[dbKey][0].tabDbKey == currentDbKey}
      on:click={() => handleSetDb(tabsByDb[dbKey][0].props)}
      use:contextMenu={getDatabaseContextMenu(tabsByDb[dbKey])}
      style={$connectionColorFactory(tabsByDb[dbKey][0].props, tabsByDb[dbKey][0].tabDbKey == currentDbKey ? 2 : 3)}
      draggable={true}
      on:dragstart={e => {
        draggingDbKey = dbKey;
      }}
      on:dragenter={e => {
        if (dbKey != draggingDbKey) {
          const groupOrderFiltered = _.pickBy($tabDatabaseGroupOrder, (v, k) =>
            $openedTabs.filter(x => x.closedTime == null).find(x => getTabDbKey(x) == k)
          );

          const items = _.sortBy(_.keys(groupOrderFiltered), x => groupOrderFiltered[x]);

          const dstIndex = _.indexOf(items, dbKey);
          const srcIndex = _.indexOf(items, draggingDbKey);
          if (srcIndex < 0 || dstIndex < 0) {
            console.warn('Drag tab group index not found');
            return;
          }
          const newItems =
            dstIndex < srcIndex
              ? [...items.slice(0, dstIndex), draggingDbKey, ...items.slice(dstIndex).filter(x => x != draggingDbKey)]
              : [
                  ...items.slice(0, dstIndex + 1).filter(x => x != draggingDbKey),
                  draggingDbKey,
                  ...items.slice(dstIndex + 1),
                ];

          const newGroupOrder = {};
          for (const key in groupOrderFiltered) {
            const index = newItems.indexOf(key);
            newGroupOrder[key] = index >= 0 ? index + 1 : groupOrderFiltered[key];
          }

          tabDatabaseGroupOrder.set(newGroupOrder);
        }
      }}
      on:dragend={e => {
        draggingDbKey = null;
      }}
    >
      <FontIcon icon={getDbIcon(dbKey)} />
      {tabsByDb[dbKey][0].tabDbName}

      {#if tabsByDb[dbKey].length > 1}
        <span class="close-button-right tabCloseButton" on:click={e => closeWithSameDb(tabsByDb[dbKey][0].tabid)}>
          <FontIcon icon="icon close" />
        </span>
      {/if}
    </div>
    <div class="db-group">
      {#each sortTabs(tabsByDb[dbKey]) as tab}
        <div
          id={`file-tab-item-${tab.tabid}`}
          class="file-tab-item"
          class:selected={tab.selected}
          on:click={e => handleTabClick(e, tab.tabid)}
          on:mouseup={e => handleMouseUp(e, tab.tabid)}
          use:contextMenu={getContextMenu(tab)}
          draggable={true}
          on:dragstart={e => {
            draggingTab = tab;
            // console.log('START', tab.tabid);
            // e.dataTransfer.setData('tab_drag_data', tab.tabid);
          }}
          on:dragenter={e => {
            // const tabid = e.dataTransfer.getData('tab_drag_data');
            // e.preventDefault();
            if (draggingTab.tabid != tab.tabid) {
              if (getTabDbKey(draggingTab) == getTabDbKey(tab)) {
                const dbKey = getTabDbKey(draggingTab);
                const items = sortTabs(tabsByDb[dbKey]);
                const dstIndex = _.findIndex(items, x => x.tabid == tab.tabid);
                const srcIndex = _.findIndex(items, x => x.tabid == draggingTab.tabid);
                if (srcIndex < 0 || dstIndex < 0) {
                  console.warn('Drag tab index not found');
                  return;
                }
                // console.log(
                //   'items',
                //   items.map(x => x.title)
                // );
                const newItems =
                  dstIndex < srcIndex
                    ? [
                        ...items.slice(0, dstIndex),
                        draggingTab,
                        ...items.slice(dstIndex).filter(x => x.tabid != draggingTab.tabid),
                      ]
                    : [
                        ...items.slice(0, dstIndex + 1).filter(x => x.tabid != draggingTab.tabid),
                        draggingTab,
                        ...items.slice(dstIndex + 1),
                      ];

                // console.log(
                //   'newItems',
                //   newItems.map(x => x.title)
                // );

                openedTabs.update(tabs =>
                  tabs.map(x => {
                    const index = _.findIndex(newItems, y => y.tabid == x.tabid);
                    if (index >= 0) {
                      return {
                        ...x,
                        tabOrder: index + 1,
                      };
                    }
                    return x;
                  })
                );
              }
            }
          }}
          on:dragend={e => {
            draggingTab = null;
          }}
        >
          <FontIcon icon={tab.busy ? 'icon loading' : tab.icon} />
          <span class="file-name">
            {tab.title}
          </span>
          <span class="close-button tabCloseButton" on:click={e => closeTab(tab.tabid)}>
            <FontIcon icon="icon close" />
          </span>
        </div>
      {/each}
    </div>
  </div>
{/each}

<style>
  .db-group {
    display: flex;
    flex: 1;
    align-content: stretch;
  }
  .db-wrapper {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }
  .db-name {
    text-align: center;
    font-size: 8pt;
    border-bottom: 1px solid var(--theme-border);
    border-right: 1px solid var(--theme-border);
    cursor: pointer;
    user-select: none;
    padding: 1px;
    position: relative;
    white-space: nowrap;

    overflow: hidden;
    text-overflow: ellipsis;
  }
  /* .db-name:hover {
    background-color: var(--theme-bg-3);
  } */
  .db-name.selected {
    background-color: var(--theme-bg-1);
  }
  .file-tab-item {
    border-right: 1px solid var(--theme-border);
    padding-left: 15px;
    padding-right: 15px;
    flex-shrink: 1;
    flex-grow: 1;
    min-width: 10px;
    display: flex;
    align-items: center;
    cursor: pointer;
    user-select: none;
  }
  .file-tab-item.selected {
    background-color: var(--theme-bg-1);
  }
  .file-name {
    margin-left: 5px;
    white-space: nowrap;
  }
  .close-button {
    margin-left: 5px;
    color: var(--theme-font-3);
  }
  .close-button-right {
    margin-left: 5px;
    margin-right: 5px;
    color: var(--theme-font-3);
    float: right;
  }

  .close-button:hover {
    color: var(--theme-font-1);
  }
  .close-button-right:hover {
    color: var(--theme-font-1);
  }
</style>
