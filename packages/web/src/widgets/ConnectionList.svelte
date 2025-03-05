<script lang="ts">
  import _ from 'lodash';
  import InlineButton from '../buttons/InlineButton.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';
  import { useConfig, useConnectionList, useServerStatus } from '../utility/metadataLoaders';
  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import AppObjectList from '../appobj/AppObjectList.svelte';
  import * as connectionAppObject from '../appobj/ConnectionAppObject.svelte';
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
  import { filterName, getConnectionLabel } from 'dbgate-tools';
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

  const connections = useConnectionList();
  const serverStatus = useServerStatus();

  export let passProps: any = {};

  let filter = '';
  let domListHandler;
  let domContainer = null;
  let domFilter = null;

  const RECENT_AND_UNSAVED_LABEL = 'Recent & unsaved';

  function extractConnectionParent(data, openedConnections, openedSingleDatabaseConnections) {
    if (data.parent) {
      return data.parent;
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

  function getFocusFlatList() {
    const expanded = $expandedConnections;
    const opened = $openedConnections;
    const status = $serverStatus;

    const res = [];
    for (const con of [...connectionsWithParent, ...connectionsWithoutParent]) {
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

  const connectionColorFactory = useConnectionColorFactory(3);

  function createGroupContextMenu(folder) {
    const handleRename = () => {
      showModal(InputTextModal, {
        value: folder,
        label: 'New folder name',
        header: 'Rename folder',
        onConfirm: async newFolder => {
          emptyConnectionGroupNames.update(folders => _.uniq(folders.map(fld => (fld == folder ? newFolder : fld))));
          apiCall('connections/batch-change-folder', {
            folder,
            newFolder,
          });
        },
      });
    };

    const handleDelete = () => {
      showModal(ConfirmModal, {
        message: `Really delete folder ${folder}? Connections in folder will be moved into root folder.`,
        onConfirm: () => {
          emptyConnectionGroupNames.update(folders => folders.filter(fld => fld != folder));
          apiCall('connections/batch-change-folder', {
            folder,
            newFolder: '',
          });
        },
      });
    };

    return [
      { text: 'Rename', onClick: handleRename },
      { text: 'Delete', onClick: handleDelete },
    ];
  }

  function createSearchMenu() {
    const res = [];
    res.push({ label: 'Search by:', isBold: true, disabled: true });
    res.push({ label: 'Display name', switchValue: 'displayName' });
    res.push({ label: 'Server', switchValue: 'server' });
    res.push({ label: 'User', switchValue: 'user' });
    res.push({ label: 'Database engine', switchValue: 'engine' });
    res.push({ label: 'Database name', switchValue: 'database' });
    return res.map(item => ({
      ...item,
      switchStore: connectionAppObjectSearchSettings,
      switchStoreGetter: getConnectionAppObjectSearchSettings,
    }));
  }
</script>

<SearchBoxWrapper>
  <SearchInput
    placeholder="Search connection or database"
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
      title="Add new connection"
      data-testid="ConnectionList_buttonNewConnection"
    >
      <FontIcon icon="icon plus-thick" />
    </InlineButton>
    <InlineButton on:click={() => runCommand('new.connection.folder')} title="Add new connection folder">
      <FontIcon icon="icon add-folder" />
    </InlineButton>
  {/if}
  <InlineButton on:click={handleRefreshConnections} title="Refresh connection list">
    <FontIcon icon="icon refresh" />
  </InlineButton>
</SearchBoxWrapper>
<WidgetsInnerContainer
  bind:this={domContainer}
  on:drop={e => {
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
      list={connectionsWithParent}
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
      groupFunc={data => extractConnectionParent(data, $openedConnections, $openedSingleDatabaseConnections)}
      expandIconFunc={plusExpandIcon}
      onDropOnGroup={handleDropOnGroup}
      emptyGroupNames={$emptyConnectionGroupNames}
      sortGroups
      groupContextMenu={createGroupContextMenu}
      collapsedGroupNames={collapsedConnectionGroupNames}
    />
    {#if (connectionsWithParent?.length > 0 && connectionsWithoutParent?.length > 0) || ($emptyConnectionGroupNames.length > 0 && connectionsWithoutParent?.length > 0)}
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
    background: var(--theme-bg-2);
    height: 1px;
    margin: 5px 10px;
  }
</style>
