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
  } from '../stores';
  import runCommand from '../commands/runCommand';
  import getConnectionLabel from '../utility/getConnectionLabel';
  import { useConnectionColorFactory } from '../utility/useConnectionColor';
  import FontIcon from '../icons/FontIcon.svelte';
  import CloseSearchButton from '../buttons/CloseSearchButton.svelte';
  import { apiCall, getVolatileRemapping } from '../utility/api';
  import LargeButton from '../buttons/LargeButton.svelte';
  import { plusExpandIcon, chevronExpandIcon } from '../icons/expandIcons';
  import { safeJsonParse } from 'dbgate-tools';
  import { showModal } from '../modals/modalTools';
  import InputTextModal from '../modals/InputTextModal.svelte';
  import ConfirmModal from '../modals/ConfirmModal.svelte';

  const connections = useConnectionList();
  const serverStatus = useServerStatus();

  let filter = '';

  $: connectionsWithStatus =
    $connections && $serverStatus
      ? $connections.map(conn => ({ ...conn, status: $serverStatus[getVolatileRemapping(conn._id)] }))
      : $connections;

  $: connectionsWithStatusFiltered = connectionsWithStatus?.filter(
    x => !x.unsaved || $openedConnections.includes(x._id) || $openedSingleDatabaseConnections.includes(x._id)
  );

  $: connectionsWithParent = connectionsWithStatusFiltered
    ? connectionsWithStatusFiltered?.filter(x => x.parent !== undefined && x.parent !== null && x.parent.length !== 0)
    : [];
  $: connectionsWithoutParent = connectionsWithStatusFiltered
    ? connectionsWithStatusFiltered?.filter(x => x.parent === undefined || x.parent === null || x.parent.length === 0)
    : [];

  const handleRefreshConnections = () => {
    for (const conid of $openedConnections) {
      apiCall('server-connections/refresh', { conid });
    }
  };

  const handleDropOnGroup = (data, group) => {
    const json = safeJsonParse(data);
    if (json?._id) {
      // if (json.parent) {
      //   emptyConnectionGroupNames.update(x => x.filter(y => y != json.parent));
      // }
      apiCall('connections/update', {
        _id: json?._id,
        values: { parent: group },
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
</script>

<SearchBoxWrapper>
  <SearchInput placeholder="Search connection or database" bind:value={filter} />
  <CloseSearchButton bind:filter />
  {#if $commandsCustomized['new.connection']?.enabled}
    <InlineButton on:click={() => runCommand('new.connection')} title="Add new connection">
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
  on:drop={e => {
    var data = e.dataTransfer.getData('app_object_drag_data');
    if (data) {
      handleDropOnGroup(data, '');
    }
  }}
>
  <AppObjectList
    list={_.sortBy(connectionsWithParent, connection => (getConnectionLabel(connection) || '').toUpperCase())}
    module={connectionAppObject}
    subItemsComponent={SubDatabaseList}
    expandOnClick
    isExpandable={data => $openedConnections.includes(data._id) && !data.singleDatabase}
    {filter}
    passProps={{ connectionColorFactory: $connectionColorFactory, showPinnedInsteadOfUnpin: true }}
    getIsExpanded={data => $expandedConnections.includes(data._id) && !data.singleDatabase}
    setIsExpanded={(data, value) => {
      expandedConnections.update(old => (value ? [...old, data._id] : old.filter(x => x != data._id)));
    }}
    groupIconFunc={chevronExpandIcon}
    groupFunc={data => data.parent}
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
    list={_.sortBy(connectionsWithoutParent, connection => (getConnectionLabel(connection) || '').toUpperCase())}
    module={connectionAppObject}
    subItemsComponent={SubDatabaseList}
    expandOnClick
    isExpandable={data => $openedConnections.includes(data._id) && !data.singleDatabase}
    {filter}
    passProps={{ connectionColorFactory: $connectionColorFactory, showPinnedInsteadOfUnpin: true }}
    getIsExpanded={data => $expandedConnections.includes(data._id) && !data.singleDatabase}
    setIsExpanded={(data, value) => {
      expandedConnections.update(old => (value ? [...old, data._id] : old.filter(x => x != data._id)));
    }}
  />
  {#if $connections && !$connections.find(x => !x.unsaved) && $openedConnections.length == 0 && $commandsCustomized['new.connection']?.enabled && !$openedTabs.find(x => !x.closedTime && x.tabComponent == 'ConnectionTab' && !x.props?.conid)}
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
