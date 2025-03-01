<script lang="ts" context="module">
  import { _t } from '../translations';

  const getCurrentValueMarker: any = {};

  export function shouldShowTab(tab, lockedDbModeArg = getCurrentValueMarker, currentDbArg = getCurrentValueMarker) {
    const lockedDbMode = lockedDbModeArg == getCurrentValueMarker ? getLockedDatabaseMode() : lockedDbModeArg;

    if (lockedDbMode) {
      const currentDb = currentDbArg == getCurrentValueMarker ? getCurrentDatabase() : currentDbArg;
      return (
        tab.closedTime == null &&
        (!tab.props?.conid ||
          !tab.props?.database ||
          (tab.props?.conid == currentDb?.connection?._id && tab.props?.database == currentDb?.name))
      );
    }
    return tab.closedTime == null;
  }

  function allowCloseTabs(tabs) {
    if (tabs.length == 0) return Promise.resolve(true);
    return new Promise(resolve => {
      showModal(CloseTabModal, {
        onCancel: () => resolve(false),
        onConfirm: () => resolve(true),
        tabs,
      });
    });
  }

  const closeTabFunc =
    (closeCondition, afterOperation = null) =>
    async tabid => {
      const activeCandidate = getOpenedTabs().find(x => x.tabid == tabid);
      const closeCandidates = getOpenedTabs()
        .filter(x => closeCondition(x, activeCandidate))
        .filter(x => x.unsaved)
        .filter(x => shouldShowTab(x));

      if (!(await allowCloseTabs(closeCandidates))) return;

      openedTabs.update(files => {
        const active = files.find(x => x.tabid == tabid);
        if (!active) return files;

        const newFiles = files.map(x => ({
          ...x,
          closedTime: shouldShowTab(x) && closeCondition(x, active) ? new Date().getTime() : x.closedTime,
          selected: false,
        }));

        if (newFiles.find(x => x.selected && shouldShowTab(x))) {
          return newFiles;
        }

        const selectedIndex = _.findLastIndex(newFiles, x => shouldShowTab(x));

        const res = newFiles.map((x, index) => ({
          ...x,
          selected: index == selectedIndex,
        }));

        if (afterOperation) {
          return afterOperation(res);
        }
        return res;
      });
    };

  export const closeMultipleTabs = async (closeCondition, deleteFromHistory = false) => {
    const closeCandidates = getOpenedTabs()
      .filter(x => closeCondition(x))
      .filter(x => x.unsaved)
      .filter(x => shouldShowTab(x));

    if (!(await allowCloseTabs(closeCandidates))) return;

    openedTabs.update(files => {
      const newFiles = deleteFromHistory
        ? files.filter(x => !closeCondition(x))
        : files.map(x => ({
            ...x,
            closedTime: shouldShowTab(x) && closeCondition(x) ? new Date().getTime() : x.closedTime,
            selected: false,
          }));

      if (newFiles.find(x => x.selected && shouldShowTab(x))) {
        return newFiles;
      }

      const selectedIndex = _.findLastIndex(newFiles, x => shouldShowTab(x));

      return newFiles.map((x, index) => ({
        ...x,
        selected: index == selectedIndex,
      }));
    });
  };

  function splitTab(multiTabIndex) {
    openedTabs.update(tabs =>
      tabs.map(x => ({
        ...x,
        multiTabIndex: x.selected ? 1 - multiTabIndex : x.multiTabIndex,
      }))
    );
  }

  function splitTabGroup(tabGroupTabs, multiTabIndex) {
    openedTabs.update(tabs =>
      tabs.map(x => ({
        ...x,
        multiTabIndex: tabGroupTabs.find(y => x.tabid == y.tabid) ? 1 - multiTabIndex : x.multiTabIndex,
      }))
    );
  }

  const closeTab = closeTabFunc((x, active) => x.tabid == active.tabid);
  const closeAll = async multiTabIndex => {
    const closeCandidates = getOpenedTabs()
      .filter(x => x.unsaved)
      .filter(x => shouldShowTab(x));

    if (!(await allowCloseTabs(closeCandidates))) return;

    const closedTime = new Date().getTime();
    openedTabs.update(tabs =>
      tabs.map(tab => ({
        ...tab,
        closedTime:
          shouldShowTab(tab) && (multiTabIndex == null || multiTabIndex == (tab.multiTabIndex || 0))
            ? closedTime
            : tab.closedTime,
        selected: false,
        visibleSecondary: false,
      }))
    );
  };
  const pinTab = tabid => {
    openedTabs.update(tabs => tabs.map(x => (x.tabid == tabid ? { ...x, tabPreviewMode: false } : x)));
  };

  const closeTabsWithCurrentDb = () => {
    const db = getCurrentDatabase();
    closeMultipleTabs(tab => {
      return db?.connection?._id == tab?.props?.conid && db?.name == tab?.props?.database;
    });
  };
  const closeTabsButCurrentDb = () => {
    const db = getCurrentDatabase();
    closeMultipleTabs(tab => {
      return db?.connection?._id != tab?.props?.conid || db?.name != tab?.props?.database;
    });
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
  const closeOthersInMultiTab = multiTabIndex =>
    closeTabFunc(
      (x, active) => x.tabid != active.tabid && (x.multiTabIndex || 0) == multiTabIndex,
      tabs => tabs.map(x => (x.selected ? { ...x, tabPreviewMode: false } : x))
    );
  const reopenClosedTab = () => {
    const lastClosedTabId = getOpenedTabs()
      .filter(x => x.closedTime)
      .sort((a, b) => b.closedTime - a.closedTime)[0]?.tabid;

    if (!lastClosedTabId) return;

    openedTabs.update(x =>
      x.map(tab =>
        tab.tabid === lastClosedTabId ? { ...tab, selected: true, closedTime: null } : { ...tab, selected: false }
      )
    );
  };

  function getTabDbName(tab, connectionList) {
    if (tab.tabComponent == 'ConnectionTab') return _t('common.connections', { defaultMessage: 'Connections' });
    if (tab.tabComponent?.startsWith('Admin')) return _t('tab.administration', { defaultMessage: 'Administration' });
    if (tab.props && tab.props.conid && tab.props.database) return tab.props.database;
    if (tab.props && tab.props.conid) {
      const connection = connectionList?.find(x => x._id == tab.props.conid);
      if (connection) return getConnectionLabel(connection, { allowExplicitDatabase: false });
      return '???';
    }
    if (tab.props && tab.props.archiveFolder) return tab.props.archiveFolder;
    return '(no DB)';
  }

  function getTabDbServer(tab, connectionList) {
    if (tab.props && tab.props.conid && tab.props.database) {
      const connection = connectionList?.find(x => x._id == tab.props.conid);
      if (connection) return getConnectionLabel(connection, { allowExplicitDatabase: false });
      return null;
    }
    return null;
  }

  function getDbIcon(key) {
    if (key) {
      if (key.startsWith('database://')) return 'icon database';
      if (key.startsWith('archive://')) return 'icon archive';
      if (key.startsWith('server://')) return 'icon server';
      if (key.startsWith('connections.')) return 'icon connection';
      if (key.startsWith('admin.')) return 'icon admin';
    }
    return 'icon file';
  }

  function switchTabByOrder(reverse) {
    const tabs = _.sortBy(
      getOpenedTabs().filter(x => shouldShowTab(x)),
      'tabOrder'
    );
    if (reverse) tabs.reverse();
    const selectedTab = tabs.find(x => x.selected);
    if (!selectedTab) return;
    const { tabOrder } = selectedTab;
    const newTab = tabs.filter(x => (reverse ? x.tabOrder < tabOrder : x.tabOrder > tabOrder))[0] || tabs[0];
    if (newTab) setSelectedTab(newTab.tabid);
  }

  registerCommand({
    id: 'tabs.nextTab',
    category: 'Tabs',
    name: _t('command.tabs.nextTab', { defaultMessage: 'Next tab' }),
    keyText: 'Ctrl+Tab',
    testEnabled: () => getOpenedTabs().filter(x => !x.closedTime).length >= 2,
    onClick: () => switchTabByOrder(false),
  });

  registerCommand({
    id: 'tabs.previousTab',
    category: 'Tabs',
    name: _t('command.tabs.previousTab', { defaultMessage: 'Previous tab' }),
    keyText: 'Ctrl+Shift+Tab',
    testEnabled: () => getOpenedTabs().filter(x => !x.closedTime).length >= 2,
    onClick: () => switchTabByOrder(true),
  });

  registerCommand({
    id: 'tabs.closeAll',
    category: 'Tabs',
    name: _t('command.tabs.closeAll', { defaultMessage: 'Close all tabs' }),
    testEnabled: () => getOpenedTabs().filter(x => !x.closedTime).length >= 1,
    onClick: closeAll,
  });

  registerCommand({
    id: 'tabs.closeTab',
    category: 'Tabs',
    name: _t('command.tabs.closeTab', { defaultMessage: 'Close tab' }),
    keyText: isElectronAvailable() ? 'CtrlOrCommand+W' : 'CtrlOrCommand+Shift+W',
    testEnabled: () => {
      const hasAnyOtherTab = getOpenedTabs().filter(x => !x.closedTime).length >= 1;
      const hasAnyModalOpen = getOpenedModals().length > 0;

      return hasAnyOtherTab && !hasAnyModalOpen;
    },
    onClick: closeCurrentTab,
  });

  registerCommand({
    id: 'tabs.closeTabsWithCurrentDb',
    category: 'Tabs',
    name: _t('command.tabs.closeTabsWithCurrentDb', { defaultMessage: 'Close tabs with current DB' }),
    testEnabled: () => getOpenedTabs().filter(x => !x.closedTime).length >= 1 && !!getCurrentDatabase(),
    onClick: closeTabsWithCurrentDb,
  });

  registerCommand({
    id: 'tabs.closeTabsButCurrentDb',
    category: 'Tabs',
    name: _t('command.tabs.closeTabsButCurrentDb', { defaultMessage: 'Close tabs but current DB' }),
    testEnabled: () => getOpenedTabs().filter(x => !x.closedTime).length >= 1 && !!getCurrentDatabase(),
    onClick: closeTabsButCurrentDb,
  });

  registerCommand({
    id: 'tabs.reopenClosedTab',
    category: 'Tabs',
    name: _t('command.tabs.reopenClosedTab', { defaultMessage: 'Reopen closed tab' }),
    keyText: 'CtrlOrCommand+Shift+T',
    testEnabled: () => getOpenedTabs().filter(x => x.closedTime).length >= 1,
    onClick: reopenClosedTab,
  });

  registerCommand({
    id: 'tabs.addToFavorites',
    category: 'Tabs',
    name: _t('command.tabs.addToFavorites', { defaultMessage: 'Add current tab to favorites' }),
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
  import _ from 'lodash';
  import { tick } from 'svelte';
  import registerCommand from '../commands/registerCommand';
  import FontIcon from '../icons/FontIcon.svelte';
  import FavoriteModal from '../modals/FavoriteModal.svelte';
  import { showModal } from '../modals/modalTools';
  import newQuery from '../query/newQuery';
  import appObjectTypes from '../appobj';

  import {
    currentDatabase,
    getActiveTab,
    getOpenedTabs,
    openedTabs,
    activeTabId,
    getActiveTabId,
    getCurrentDatabase,
    lockedDatabaseMode,
    getLockedDatabaseMode,
    draggingDbGroup,
    draggingDbGroupTarget,
    draggingTab,
    draggingTabTarget,
    getOpenedModals,
  } from '../stores';
  import tabs from '../tabs';
  import { setSelectedTab, switchCurrentDatabase } from '../utility/common';
  import contextMenu from '../utility/contextMenu';
  import { isElectronAvailable } from '../utility/getElectron';
  import { getConnectionInfo, useConnectionList, useSettings } from '../utility/metadataLoaders';
  import { duplicateTab, getTabDbKey, sortTabs, groupTabs } from '../utility/openNewTab';
  import { useConnectionColorFactory } from '../utility/useConnectionColor';
  import TabCloseButton from '../elements/TabCloseButton.svelte';
  import CloseTabModal from '../modals/CloseTabModal.svelte';
  import SwitchDatabaseModal from '../modals/SwitchDatabaseModal.svelte';
  import { getConnectionLabel } from 'dbgate-tools';
  import { handleAfterTabClick } from '../utility/changeCurrentDbByTab';
  import { getBoolSettingsValue } from '../settings/settingsTools';

  export let multiTabIndex;
  export let shownTab;

  $: showTabFilterFunc = tab =>
    shouldShowTab(tab, $lockedDatabaseMode, $currentDatabase) && (tab.multiTabIndex || 0) == multiTabIndex;
  $: connectionList = useConnectionList();

  $: currentDbKey =
    $currentDatabase && $currentDatabase.name && $currentDatabase.connection
      ? `database://${$currentDatabase.name}-${$currentDatabase.connection._id}`
      : $currentDatabase && $currentDatabase.connection
        ? `server://${$currentDatabase.connection._id}`
        : '_no';

  $: tabsWithDb = $openedTabs.filter(showTabFilterFunc).map(tab => ({
    ...tab,
    tabDbName: getTabDbName(tab, $connectionList),
    tabDbKey: getTabDbKey(tab),
    tabDbServer: getTabDbServer(tab, $connectionList),
  }));

  $: groupedTabs = groupTabs(tabsWithDb);

  // $: tabsByDb = _.groupBy(tabsWithDb, 'tabDbKey');
  // $: dbKeys = _.sortBy(_.keys(tabsByDb), [x => $tabDatabaseGroupOrder[x] || 0, x => x]);

  $: scrollInViewTab($activeTabId);

  $: filteredTabsFromAllParts = $openedTabs.filter(x => shouldShowTab(x, $lockedDatabaseMode, $currentDatabase));
  $: allowSplitTab =
    _.uniq(filteredTabsFromAllParts.map(x => x.multiTabIndex || 0)).length == 1 && filteredTabsFromAllParts.length >= 2;

  $: settings = useSettings();

  const connectionColorFactory = useConnectionColorFactory(3, null, true);

  const handleTabClick = (e, tabid) => {
    if (e.target.closest('.tabCloseButton')) {
      return;
    }
    setSelectedTab(tabid);
    handleAfterTabClick();
  };

  const handleMouseDown = (e, tabid) => {
    if (e.button == 1) {
      e.preventDefault();
    }
  };

  const handleMouseUp = (e, tabid) => {
    if (e.button == 1) {
      e.preventDefault();
      closeTab(tabid);
    }
  };

  const handleDoubleClick = (e, tabid) => {
    e.preventDefault();

    openedTabs.update(tabs =>
      tabs.map(x => ({
        ...x,
        tabPreviewMode: x.tabid == tabid ? false : x.tabPreviewMode,
      }))
    );
  };

  const getContextMenu = tab => () => {
    const { tabid, props, tabComponent, appObject, appObjectData } = tab;

    const appobj = appObject ? appObjectTypes[appObject] : null;

    return [
      tab.tabPreviewMode && {
        text: 'Pin tab',
        onClick: () => pinTab(tabid),
      },
      {
        text: 'Close',
        onClick: () => closeTab(tabid),
      },
      {
        text: 'Close all',
        onClick: () => closeAll(multiTabIndex),
      },
      {
        text: 'Close others',
        onClick: () => closeOthersInMultiTab(multiTabIndex)(tabid),
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
      tabComponent &&
        tabs[tabComponent] &&
        tabs[tabComponent].allowSwitchDatabase &&
        tabs[tabComponent].allowSwitchDatabase(props) && [
          { divider: true },
          {
            text: 'Switch database',
            onClick: () => showModal(SwitchDatabaseModal, { callingTab: tab }),
          },
        ],
      { divider: true },
      appobj &&
        appobj.createAppObjectMenu &&
        appobj.createTitle &&
        appObjectData && {
          text: appobj.createTitle(appObjectData),
          submenu: appobj.createAppObjectMenu(appObjectData),
        },
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
        switchCurrentDatabase({ connection, name: database });
        return;
      }
    }
    switchCurrentDatabase(null);
  };

  async function scrollInViewTab(tabid) {
    await tick();
    const element = document.getElementById(`file-tab-item-${tabid}`);
    if (element) {
      element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }

  function dragDropTabs(draggingTabs, targetTabs, multiTabIndex) {
    if (draggingTabs.find(x => targetTabs.find(y => x.tabid == y.tabid))) return;

    const items = sortTabs($openedTabs.filter(x => x.closedTime == null));
    const dstIndexes = targetTabs.map(targetTab => _.findIndex(items, x => x.tabid == targetTab.tabid));
    const dstIndexFirst = _.min(dstIndexes) as number;
    const dstIndexLast = _.max(dstIndexes) as number;
    const srcIndex = _.findIndex(items, x => x.tabid == draggingTabs[0].tabid);
    if (srcIndex < 0 || dstIndexFirst < 0 || dstIndexLast < 0) {
      console.warn('Drag tab index not found');
      return;
    }
    const newItems =
      dstIndexFirst < srcIndex
        ? [
            ...items.slice(0, dstIndexFirst),
            ...draggingTabs,
            ...items.slice(dstIndexFirst).filter(x => !draggingTabs.find(y => y.tabid == x.tabid)),
          ]
        : [
            ...items.slice(0, dstIndexLast + 1).filter(x => !draggingTabs.find(y => y.tabid == x.tabid)),
            ...draggingTabs,
            ...items.slice(dstIndexLast + 1),
          ];

    openedTabs.update(tabs =>
      tabs.map(x => {
        const index = _.findIndex(newItems, y => y.tabid == x.tabid);
        if (index >= 0) {
          return {
            ...x,
            tabOrder: index + 1,
            multiTabIndex: draggingTabs.find(y => y.tabid == x.tabid) ? multiTabIndex : x.multiTabIndex,
          };
        }
        return x;
      })
    );

    draggingDbGroup.set(null);
    draggingDbGroupTarget.set(null);
    draggingTab.set(null);
    draggingTabTarget.set(null);
  }

  let domTabs;

  function handleTabsWheel(e) {
    if (!e.shiftKey) {
      e.preventDefault();
      domTabs.scrollBy({ top: 0, left: e.deltaY < 0 ? -150 : 150, behavior: 'smooth' });
    }
  }
</script>

<div class="root">
  <div class="tabs" class:can-split={allowSplitTab} on:wheel={handleTabsWheel} bind:this={domTabs}>
    {#each groupedTabs as tabGroup}
      <div class="db-wrapper">
        {#if !$lockedDatabaseMode}
          <div
            class="db-name"
            class:selected={$draggingDbGroup
              ? tabGroup.grpid == $draggingDbGroupTarget?.grpid
              : tabGroup.tabDbKey == currentDbKey}
            on:mouseup={e => {
              if (e.button == 1) {
                closeMultipleTabs(tab => tabGroup.tabs.find(x => x.tabid == tab.tabid));
              } else {
                handleSetDb(tabGroup.tabs[0].props);
              }
            }}
            use:contextMenu={getDatabaseContextMenu(tabGroup.tabs)}
            style={$connectionColorFactory(
              tabGroup.tabs[0].props,
              ($draggingDbGroup ? tabGroup.grpid == $draggingDbGroupTarget?.grpid : tabGroup.tabDbKey == currentDbKey)
                ? 2
                : 3
            )}
            draggable={true}
            on:dragstart={e => {
              $draggingDbGroup = tabGroup;
            }}
            on:dragenter={e => {
              $draggingDbGroupTarget = tabGroup;
            }}
            on:drop={e => {
              dragDropTabs($draggingDbGroup.tabs, tabGroup.tabs, multiTabIndex);
            }}
            on:dragend={e => {
              $draggingDbGroup = null;
              $draggingDbGroupTarget = null;
            }}
          >
            <div class="db-name-inner">
              {#if $settings?.['tabGroup.showServerName'] && tabGroup.tabDbServer}
                <FontIcon icon="icon server" />
                {tabGroup.tabDbServer}
              {/if}
              <FontIcon icon={getDbIcon(tabGroup.tabDbKey)} />
              {tabGroup.tabDbName}
              {#if $connectionList?.find(x => x._id == tabGroup.tabs[0]?.props?.conid)?.isReadOnly}
                <FontIcon icon="icon lock" />
              {/if}
            </div>
            <div class="tab-group-buttons">
              {#if allowSplitTab && groupedTabs.length > 1}
                <div
                  class="tab-group-button tabCloseButton"
                  on:click={e => splitTabGroup(tabGroup.tabs, multiTabIndex)}
                >
                  <FontIcon icon="icon split" />
                </div>
              {/if}
              <div
                class="tab-group-button tabCloseButton"
                on:click={e => closeMultipleTabs(tab => tabGroup.tabs.find(x => x.tabid == tab.tabid))}
              >
                <FontIcon icon="icon close" />
              </div>
            </div>
          </div>
        {/if}
        <div class="db-group">
          {#each tabGroup.tabs as tab}
            <div
              id={`file-tab-item-${tab.tabid}`}
              class="file-tab-item"
              class:selected={$draggingTab || $draggingDbGroup
                ? tab.tabid == $draggingTabTarget?.tabid
                : tab.tabid == shownTab?.tabid}
              class:preview={!!tab.tabPreviewMode}
              on:click={e => handleTabClick(e, tab.tabid)}
              on:mousedown={e => handleMouseDown(e, tab.tabid)}
              on:mouseup={e => handleMouseUp(e, tab.tabid)}
              on:dblclick={e => handleDoubleClick(e, tab.tabid)}
              use:contextMenu={getContextMenu(tab)}
              draggable={true}
              on:dragstart={async e => {
                $draggingTab = tab;
                await tick();
                setSelectedTab(tab.tabid);
                // console.log('START', tab.tabid);
                // e.dataTransfer.setData('tab_drag_data', tab.tabid);
              }}
              on:dragenter={e => {
                $draggingTabTarget = tab;
              }}
              on:drop={e => {
                if ($draggingTab) {
                  dragDropTabs([$draggingTab], [tab], multiTabIndex);
                }
                if ($draggingDbGroup) {
                  dragDropTabs($draggingDbGroup.tabs, [tab], multiTabIndex);
                }
              }}
              on:dragend={e => {
                $draggingTab = null;
                $draggingTabTarget = null;
              }}
            >
              {#if tab.tabPreviewMode}
                <span
                  class="pin-button"
                  data-testid="TabsPanel_pinTabButton"
                  on:click={e => pinTab(tab.tabid)}
                  title="This tab is in preview mode, it will be replaced eg. when clicking table. Click to switch to normal mode. You could also double-click tab header."
                >
                  <FontIcon icon="icon pin-outline" />
                </span>
              {/if}
              <FontIcon icon={tab.busy ? 'icon loading' : tab.icon} />
              <span class="file-name">
                {tab.title}
              </span>
              {#if $lockedDatabaseMode && tab.props?.conid && tab.props?.conid != $currentDatabase?.connection?._id}
                <FontIcon icon="img warn" padLeft title="This tab is bound to different server than actual DB" />
              {/if}
              <TabCloseButton unsaved={tab.unsaved} on:click={e => closeTab(tab.tabid)} />
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
  <div class="icons-wrapper">
    {#if allowSplitTab}
      <div
        class="icon-button"
        on:click={() => splitTab(multiTabIndex)}
        title="Split window"
        data-testid="TabsPanel_buttonSplit"
      >
        <FontIcon icon="icon split" />
      </div>
    {/if}
    <div
      class="icon-button"
      on:click={() => newQuery({ multiTabIndex })}
      title="New query"
      data-testid="TabsPanel_buttonNewQuery"
    >
      <FontIcon icon="icon add" />
    </div>
  </div>
</div>

<style>
  .root {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
  }
  .icons-wrapper {
    position: absolute;
    right: 5px;
    font-size: 20pt;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    display: flex;
  }
  .icon-button {
    color: var(--theme-font-2);
    cursor: pointer;
  }
  .icon-button:hover {
    color: var(--theme-font-1);
  }
  .tabs {
    height: var(--dim-tabs-panel-height);
    display: flex;
    overflow-x: auto;
    position: absolute;
    left: 0;
    top: 0;
    right: 35px;
    bottom: 0;
  }
  .tabs.can-split {
    right: 60px;
  }
  .tabs::-webkit-scrollbar {
    height: 7px;
  }

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
    display: flex;
    text-align: center;
    font-size: 8pt;
    border-bottom: 1px solid var(--theme-border);
    border-right: 1px solid var(--theme-border);
    cursor: pointer;
    user-select: none;
    padding: 1px;
    position: relative;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .db-name-inner {
    justify-content: center;
    flex-grow: 1;
  }
  /* .db-name:hover {
    background-color: var(--theme-bg-3);
  } */
  .db-name.selected {
    background-color: var(--theme-bg-0);
  }
  .file-tab-item {
    border-right: 1px solid var(--theme-border);
    border-bottom: 2px solid var(--theme-border);
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
    background-color: var(--theme-bg-0);
  }
  .file-tab-item.preview {
    font-style: italic;
  }
  .file-name {
    margin-left: 5px;
    white-space: nowrap;
    flex-grow: 1;
  }
  .tab-group-buttons {
    margin-left: 5px;
    margin-right: 5px;
    color: var(--theme-font-3);
    display: flex;
  }

  .tab-group-button:hover {
    color: var(--theme-font-1);
  }

  .pin-button {
    color: var(--theme-font-3);
    cursor: pointer;
  }

  .pin-button:hover {
    color: var(--theme-font-1);
  }
</style>
