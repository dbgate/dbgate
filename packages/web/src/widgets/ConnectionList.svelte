<script lang="ts">
  import _ from 'lodash';
  import InlineButton from '../buttons/InlineButton.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';
  import { useConfig, useConnectionList, useServerStatus, useSettings } from '../utility/metadataLoaders';
  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import AppObjectList from '../appobj/AppObjectList.svelte';
  import * as connectionAppObject from '../appobj/ConnectionAppObject.svelte';
  import ConnectionFolderGroup, { FOLDER_DRAG_DATA_TYPE } from '../appobj/ConnectionFolderGroup.svelte';
  import SubDatabaseList from '../appobj/SubDatabaseList.svelte';
  import {
    commandsCustomized,
    expandedConnections,
    openedConnections,
    openedSingleDatabaseConnections,
    openedTabs,
    emptyConnectionGroupNames,
    collapsedConnectionGroupNames,
    focusedConnectionOrDatabase,
    getFocusedConnectionOrDatabase,
    currentDatabase,
    getCurrentConfig,
    connectionAppObjectSearchSettings,
    getConnectionAppObjectSearchSettings,
  } from '../stores';
  import runCommand from '../commands/runCommand';
  import {
    filterName,
    getConnectionLabel,
    normalizeFolderPath,
    getParentFolderPath,
    getFolderName,
    isFolderSameOrDescendant,
    replaceFolderPathPrefixInList,
    buildFolderTree,
    computeFolderMove,
    reorderFolderList,
  } from 'dbgate-tools';
  import { useConnectionColorFactory } from '../utility/useConnectionColor';
  import FontIcon from '../icons/FontIcon.svelte';
  import CloseSearchButton from '../buttons/CloseSearchButton.svelte';
  import { apiCall, volatileConnectionMapStore } from '../utility/api';
  import LargeButton from '../buttons/LargeButton.svelte';
  import { plusExpandIcon, chevronExpandIcon } from '../icons/expandIcons';
  import { safeJsonParse } from 'dbgate-tools';
  import { showModal } from '../modals/modalTools';
  import InputTextModal from '../modals/InputTextModal.svelte';
  import ConfirmModal from '../modals/ConfirmModal.svelte';
  import AppObjectListHandler from './AppObjectListHandler.svelte';
  import { getLocalStorage } from '../utility/storageCache';
  import { switchCurrentDatabase } from '../utility/common';
  import openNewTab from '../utility/openNewTab';
  import { openConnection } from '../appobj/ConnectionAppObject.svelte';
  import {
    getBoolSettingsValue,
    getConnectionClickActionSetting,
    getDatabaseClickActionSetting,
    getOpenDetailOnArrowsSettings,
  } from '../settings/settingsTools';
  import DropDownButton from '../buttons/DropDownButton.svelte';
  import { _t } from '../translations';

  const connections = useConnectionList();
  const serverStatus = useServerStatus();
  const settings = useSettings();
  const config = useConfig();

  export let passProps: any = {};

  let filter = '';
  let domListHandler;
  let domContainer = null;
  let domFilter = null;

  const RECENT_AND_UNSAVED_LABEL = _t('connection.recentUnsaved', { defaultMessage: 'Recent & unsaved' });

  function extractConnectionParent(data, openedConnections, openedSingleDatabaseConnections) {
    const parent = normalizeFolderPath(data.parent);
    if (parent) {
      return parent;
    }
    if (data.unsaved && !openedConnections.includes(data._id) && !openedSingleDatabaseConnections.includes(data._id)) {
      return RECENT_AND_UNSAVED_LABEL;
    }

    return null;
  }

  $: connectionsWithStatus =
    $connections && $serverStatus
      ? $connections.map(conn => ({
          ...conn,
          status: $serverStatus[$volatileConnectionMapStore[conn._id] || conn._id],
        }))
      : $connections;

  $: connectionsWithParent = _.sortBy(
    connectionsWithStatus
      ? connectionsWithStatus?.filter(x =>
          extractConnectionParent(x, $openedConnections, $openedSingleDatabaseConnections)
        )
      : [],
    connection => (getConnectionLabel(connection) || '').toUpperCase()
  );
  $: connectionsWithoutParent = _.sortBy(
    connectionsWithStatus
      ? connectionsWithStatus?.filter(
          x => !extractConnectionParent(x, $openedConnections, $openedSingleDatabaseConnections)
        )
      : [],
    connection => (getConnectionLabel(connection) || '').toUpperCase()
  );

  $: folderOrder = ($settings?.connectionFolderOrder as string[]) || [];
  $: folderDragEnabled = !$config?.runAsPortal;
  $: recentConnections = connectionsWithParent.filter(x => !normalizeFolderPath(x.parent));
  $: connectionsByFolder = _.groupBy(
    connectionsWithParent.filter(x => normalizeFolderPath(x.parent)),
    x => normalizeFolderPath(x.parent)
  );
  $: folderTree = buildFolderTree([..._.keys(connectionsByFolder), ...$emptyConnectionGroupNames], folderOrder);
  $: connectionMatcher = connectionAppObject.createMatcher(filter, $connectionAppObjectSearchSettings);

  // same match logic as AppObjectList
  function labelConnection(data, matcher) {
    const matchResult = matcher ? matcher(data) : true;
    let isMatched = true;
    let isMainMatched = true;
    let isChildMatched = true;
    if (matchResult == false || matchResult == 'none') {
      isMatched = false;
      isChildMatched = false;
      isMainMatched = false;
    } else if (matchResult == 'child') {
      isMainMatched = false;
    } else if (matchResult == 'main') {
      isChildMatched = false;
    }
    return { data, isMatched, isChildMatched, isMainMatched };
  }

  $: folderItems = new Map(
    _.keys(connectionsByFolder).map(folder => [
      folder,
      connectionsByFolder[folder].map(data => labelConnection(data, connectionMatcher)),
    ])
  );

  function computeFolderCounts(nodes, items, res = new Map()) {
    for (const node of nodes) {
      computeFolderCounts(node.children, items, res);
      const own = items.get(node.path) || [];
      const counts = { matched: own.filter(x => x.isMatched).length, total: own.length };
      for (const child of node.children) {
        counts.matched += res.get(child.path).matched;
        counts.total += res.get(child.path).total;
      }
      res.set(node.path, counts);
    }
    return res;
  }

  $: folderCounts = computeFolderCounts(folderTree, folderItems);

  function getConnectionsInVisualOrder() {
    const res = [];
    const collapsed = $collapsedConnectionGroupNames;
    if (!collapsed.includes(RECENT_AND_UNSAVED_LABEL)) {
      res.push(...recentConnections);
    }
    const addFolders = nodes => {
      for (const node of nodes) {
        if (collapsed.includes(node.path)) continue;
        addFolders(node.children);
        res.push(...(connectionsByFolder[node.path] || []));
      }
    };
    addFolders(folderTree);
    res.push(...connectionsWithoutParent);
    return res;
  }

  function getFocusFlatList() {
    const expanded = $expandedConnections;
    const opened = $openedConnections;
    const status = $serverStatus;

    const res = [];
    for (const con of getConnectionsInVisualOrder()) {
      const databases = getLocalStorage(`database_list_${con._id}`) || [];
      if (!filterName(filter, con.displayName, con.server, ...databases.map(x => x.name))) {
        continue;
      }

      res.push({
        connection: con,
        conid: con._id,
        database: con.singleDatabase ? con.defaultDatabase : null,
      });

      if ((expanded.includes(con._id) && opened.includes(con._id) && status?.[con._id]?.name == 'ok') || filter) {
        for (const db of _.sortBy(databases, x => x.sortOrder ?? x.name)) {
          if (!filterName(filter, con.displayName, con.server, db.name)) {
            continue;
          }

          res.push({
            conid: con._id,
            database: db.name,
            connection: con,
          });
        }
      }
    }

    return res;
  }

  const handleRefreshConnections = () => {
    for (const conid of $openedConnections) {
      apiCall('server-connections/refresh', { conid });
    }
  };

  function findFolderChildren(nodes, parent) {
    if (!parent) return nodes;
    for (const node of nodes) {
      if (node.path == parent) return node.children;
      const res = findFolderChildren(node.children, parent);
      if (res) return res;
    }
    return null;
  }

  function saveFolderOrder(order) {
    if (!_.isEqual(order, folderOrder)) {
      apiCall('config/update-settings', { connectionFolderOrder: order });
    }
  }

  // moves folder with its whole subtree (connections, empty subfolders, collapsed state)
  function moveFolderSubtree(folder, newFolder, removeFolderItself = false) {
    const rewrite = list =>
      replaceFolderPathPrefixInList(
        removeFolderItself ? list.filter(x => x != folder) : list,
        folder,
        newFolder
      );
    emptyConnectionGroupNames.update(rewrite);
    collapsedConnectionGroupNames.update(rewrite);
    apiCall('connections/batch-change-folder', { folder, newFolder });
    return rewrite(folderOrder);
  }

  const handleDropFolder = (source, target, position) => {
    if (!folderDragEnabled) return;
    source = normalizeFolderPath(source);
    target = normalizeFolderPath(target);
    if (!source || source == target) return;
    const targetParent = position == 'into' ? target : getParentFolderPath(target);
    if (isFolderSameOrDescendant(targetParent, source)) return;

    let newPath = source;
    let order = folderOrder;
    if (getParentFolderPath(source) != targetParent) {
      newPath = computeFolderMove(source, targetParent);
      order = moveFolderSubtree(source, newPath);
    } else if (position == 'into') {
      return;
    }

    if (position != 'into' && newPath != target) {
      const siblings = _.uniq([
        ...(findFolderChildren(folderTree, targetParent) || []).map(x => x.path).filter(x => x != source),
        newPath,
      ]);
      order = reorderFolderList(order, siblings, newPath, target, position);
    }
    saveFolderOrder(order);
  };

  const handleDropOnGroup = (data, group) => {
    if (group == RECENT_AND_UNSAVED_LABEL) {
      return;
    }
    const json = safeJsonParse(data);
    if (json?._id) {
      // if (json.parent) {
      //   emptyConnectionGroupNames.update(x => x.filter(y => y != json.parent));
      // }
      apiCall('connections/update', {
        _id: json?._id,
        values: { parent: group, unsaved: false },
      });
    }
  };

  const connectionColorFactory = useConnectionColorFactory();

  function createGroupContextMenu(folder) {
    const parentFolder = getParentFolderPath(folder);

    const handleNewSubfolder = () => {
      showModal(InputTextModal, {
        value: '',
        label: _t('connection.createNewFolderName', { defaultMessage: 'New connection folder name' }),
        header: _t('connection.createNewSubfolder', { defaultMessage: 'Create subfolder' }),
        onConfirm: async name => {
          const newFolder = normalizeFolderPath(`${folder}/${name}`);
          if (newFolder == folder) return;
          emptyConnectionGroupNames.update(names => (names.includes(newFolder) ? names : [...names, newFolder]));
          collapsedConnectionGroupNames.update(names => names.filter(x => x != folder));
        },
      });
    };

    const handleRename = () => {
      showModal(InputTextModal, {
        value: getFolderName(folder),
        label: _t('connection.newFolderName', { defaultMessage: 'New folder name' }),
        header: _t('connection.renameFolder', { defaultMessage: 'Rename folder' }),
        onConfirm: async newName => {
          const newFolder = normalizeFolderPath(parentFolder ? `${parentFolder}/${newName}` : newName);
          if (!newFolder || newFolder == folder || newFolder == parentFolder) return;
          saveFolderOrder(moveFolderSubtree(folder, newFolder));
        },
      });
    };

    const handleDelete = () => {
      showModal(ConfirmModal, {
        message: parentFolder
          ? _t('connection.deleteSubfolderConfirm', {
              defaultMessage:
                'Really delete folder {folder}? Connections and subfolders in folder will be moved into folder {parentFolder}.',
              values: { folder, parentFolder },
            })
          : _t('connection.deleteFolderConfirm', {
              defaultMessage: 'Really delete folder {folder}? Connections in folder will be moved into root folder.',
              values: { folder },
            }),
        onConfirm: () => {
          saveFolderOrder(moveFolderSubtree(folder, parentFolder, true));
        },
      });
    };

    return [
      { text: _t('connection.newSubfolder', { defaultMessage: 'New subfolder' }), onClick: handleNewSubfolder },
      { text: _t('common.rename', { defaultMessage: 'Rename' }), onClick: handleRename },
      { text: _t('common.delete', { defaultMessage: 'Delete' }), onClick: handleDelete },
    ];
  }

  function createSearchMenu() {
    const res = [];
    res.push({ label: _t('common.searchBy', { defaultMessage: 'Search by:' }), isBold: true, disabled: true });
    res.push({ label: _t('connection.displayName', { defaultMessage: 'Display name' }), switchValue: 'displayName' });
    res.push({ label: _t('connection.server', { defaultMessage: 'Server' }), switchValue: 'server' });
    res.push({ label: _t('connection.user', { defaultMessage: 'User' }), switchValue: 'user' });
    res.push({ label: _t('connection.engine', { defaultMessage: 'Database engine' }), switchValue: 'engine' });
    res.push({ label: _t('connection.database', { defaultMessage: 'Database name' }), switchValue: 'database' });
    return res.map(item => ({
      ...item,
      switchStore: connectionAppObjectSearchSettings,
      switchStoreGetter: getConnectionAppObjectSearchSettings,
    }));
  }
</script>

<SearchBoxWrapper {filter}>
  <SearchInput
    placeholder={_t('connection.search.placeholder', { defaultMessage: 'Search connection or database' })}
    bind:value={filter}
    bind:this={domFilter}
    onFocusFilteredList={() => {
      domListHandler?.focusFirst();
    }}
    data-testid="ConnectionList_search"
  />
  <CloseSearchButton bind:filter />
  <DropDownButton
    icon={filter ? 'img filter-active' : 'icon filter'}
    menu={createSearchMenu}
    square={!!filter}
    narrow={false}
  />
  {#if $commandsCustomized['new.connection']?.enabled}
    <InlineButton
      on:click={() => runCommand('new.connection')}
      title={_t('connection.new.title', { defaultMessage: 'Add new connection' })}
      data-testid="ConnectionList_buttonNewConnection"
    >
      <FontIcon icon="icon plus-thick" />
    </InlineButton>
    <InlineButton
      on:click={() => runCommand('new.connection.folder')}
      title={_t('connection.new.folder.title', { defaultMessage: 'Add new connection folder' })}
    >
      <FontIcon icon="icon add-folder" />
    </InlineButton>
  {/if}
  <InlineButton
    on:click={handleRefreshConnections}
    title={_t('connection.refresh.title', { defaultMessage: 'Refresh connection list' })}
  >
    <FontIcon icon="icon refresh" />
  </InlineButton>
</SearchBoxWrapper>
<WidgetsInnerContainer
  bind:this={domContainer}
  on:drop={e => {
    var folderData = e.dataTransfer.getData(FOLDER_DRAG_DATA_TYPE);
    if (folderData) {
      handleDropFolder(folderData, '', 'into');
      return;
    }
    var data = e.dataTransfer.getData('app_object_drag_data');
    if (data) {
      handleDropOnGroup(data, '');
    }
  }}
  data-testid="ConnectionList_container"
>
  <AppObjectListHandler
    bind:this={domListHandler}
    list={getFocusFlatList}
    selectedObjectStore={focusedConnectionOrDatabase}
    getSelectedObject={getFocusedConnectionOrDatabase}
    selectedObjectMatcher={(o1, o2) => o1?.conid == o2?.conid && o1?.database == o2?.database}
    getDefaultFocusedItem={() =>
      $currentDatabase
        ? {
            conid: $currentDatabase?.connection?._id,
            database: $currentDatabase?.name,
            connection: $currentDatabase?.connection,
          }
        : null}
    onScrollTop={() => {
      domContainer?.scrollTop();
    }}
    onFocusFilterBox={text => {
      domFilter?.focus(text);
    }}
    handleObjectClick={(data, clickAction) => {
      const connectionClickAction = getConnectionClickActionSetting();
      const databaseClickAction = getDatabaseClickActionSetting();
      const openDetailOnArrows = getOpenDetailOnArrowsSettings();

      if (data.database) {
        if (databaseClickAction == 'switch' && clickAction == 'leftClick') {
          switchCurrentDatabase({ connection: data.connection, name: data.database });
        }

        if (clickAction == 'keyEnter' || clickAction == 'dblClick') {
          switchCurrentDatabase({ connection: data.connection, name: data.database });
        }
      } else {
        if (clickAction == 'keyEnter' || clickAction == 'dblClick') {
          openConnection(data.connection);
        } else {
          const config = getCurrentConfig();
          if (
            config.runAsPortal == false &&
            !config.storageDatabase &&
            connectionClickAction == 'openDetails' &&
            (clickAction == 'leftClick' || (clickAction == 'keyArrow' && openDetailOnArrows))
          ) {
            openNewTab({
              title: getConnectionLabel(data.connection),
              icon: 'img connection',
              tabComponent: 'ConnectionTab',
              tabPreviewMode: true,
              props: {
                conid: data.conid,
              },
            });
          }
        }
      }
    }}
    handleExpansion={(item, value) => {
      if (item.database) {
        return;
      }
      expandedConnections.update(old => (value ? [...old, item.conid] : old.filter(x => x != item.conid)));
    }}
  >
    <AppObjectList
      list={recentConnections}
      module={connectionAppObject}
      subItemsComponent={() => SubDatabaseList}
      expandOnClick
      isExpandable={data => $openedConnections.includes(data._id) && !data.singleDatabase}
      {filter}
      passProps={{
        ...passProps,
        connectionColorFactory: $connectionColorFactory,
        showPinnedInsteadOfUnpin: true,
        searchSettings: $connectionAppObjectSearchSettings,
      }}
      getIsExpanded={data => $expandedConnections.includes(data._id) && !data.singleDatabase}
      setIsExpanded={(data, value) => {
        expandedConnections.update(old => (value ? [...old, data._id] : old.filter(x => x != data._id)));
      }}
      groupIconFunc={chevronExpandIcon}
      groupFunc={() => RECENT_AND_UNSAVED_LABEL}
      expandIconFunc={plusExpandIcon}
      collapsedGroupNames={collapsedConnectionGroupNames}
    />
    {#each folderTree as node (node.path)}
      <ConnectionFolderGroup
        {node}
        itemsByFolder={folderItems}
        countsByFolder={folderCounts}
        module={connectionAppObject}
        subItemsComponent={() => SubDatabaseList}
        expandOnClick
        isExpandable={data => $openedConnections.includes(data._id) && !data.singleDatabase}
        {filter}
        passProps={{
          ...passProps,
          connectionColorFactory: $connectionColorFactory,
          showPinnedInsteadOfUnpin: true,
          searchSettings: $connectionAppObjectSearchSettings,
        }}
        getIsExpanded={data => $expandedConnections.includes(data._id) && !data.singleDatabase}
        setIsExpanded={(data, value) => {
          expandedConnections.update(old => (value ? [...old, data._id] : old.filter(x => x != data._id)));
        }}
        expandIconFunc={plusExpandIcon}
        collapsedGroupNames={collapsedConnectionGroupNames}
        groupContextMenu={createGroupContextMenu}
        {folderDragEnabled}
        onDropConnection={handleDropOnGroup}
        onDropFolder={handleDropFolder}
      />
    {/each}
    {#if (recentConnections.length > 0 || folderTree.length > 0) && connectionsWithoutParent?.length > 0}
      <div class="br" />
    {/if}
    <AppObjectList
      list={connectionsWithoutParent}
      module={connectionAppObject}
      subItemsComponent={() => SubDatabaseList}
      expandOnClick
      isExpandable={data => $openedConnections.includes(data._id) && !data.singleDatabase}
      {filter}
      passProps={{
        ...passProps,
        connectionColorFactory: $connectionColorFactory,
        showPinnedInsteadOfUnpin: true,
        searchSettings: $connectionAppObjectSearchSettings,
      }}
      getIsExpanded={data => $expandedConnections.includes(data._id) && !data.singleDatabase}
      setIsExpanded={(data, value) => {
        expandedConnections.update(old => (value ? [...old, data._id] : old.filter(x => x != data._id)));
      }}
    />
  </AppObjectListHandler>
  {#if $connections && $connections.length == 0 && $openedConnections.length == 0 && $commandsCustomized['new.connection']?.enabled && !$openedTabs.find(x => !x.closedTime && x.tabComponent == 'ConnectionTab' && !x.props?.conid)}
    <LargeButton icon="icon new-connection" on:click={() => runCommand('new.connection')} fillHorizontal
      >Add new connection</LargeButton
    >
    <!-- <ToolbarButton icon="icon new-connection" on:click={() => runCommand('new.connection')}>
      Add new connection
    </ToolbarButton> -->
  {/if}
</WidgetsInnerContainer>

<style>
  .br {
    background: var(--theme-searchbox-background);
    height: 1px;
    margin: 5px 10px;
  }
</style>
