<script lang="ts">
  import _ from 'lodash';
  import InlineButton from '../elements/InlineButton.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';
  import { useConnectionList, useServerStatus } from '../utility/metadataLoaders';
  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import AppObjectList from '../appobj/AppObjectList.svelte';
  import * as connectionAppObject from '../appobj/ConnectionAppObject.svelte';
  import SubDatabaseList from '../appobj/SubDatabaseList.svelte';
  import { commands, commandsCustomized, openedConnections } from '../stores';
  import axiosInstance from '../utility/axiosInstance';
  import ToolbarButton from './ToolbarButton.svelte';
  import runCommand from '../commands/runCommand';
  import getConnectionLabel from '../utility/getConnectionLabel';
  import { useConnectionColorFactory } from '../utility/useConnectionColor';
  import FontIcon from '../icons/FontIcon.svelte';
  import CloseSearchButton from '../elements/CloseSearchButton.svelte';
  import { apiCall } from '../utility/api';

  const connections = useConnectionList();
  const serverStatus = useServerStatus();

  let filter = '';

  $: connectionsWithStatus =
    $connections && $serverStatus
      ? $connections.map(conn => ({ ...conn, status: $serverStatus[conn._id] }))
      : $connections;

  const handleRefreshConnections = () => {
    for (const conid of $openedConnections) {
      apiCall('server-connections/refresh', { conid });
    }
  };

  const connectionColorFactory = useConnectionColorFactory(3);
</script>

<SearchBoxWrapper>
  <SearchInput placeholder="Search connection or database" bind:value={filter} />
  <CloseSearchButton bind:filter />
  {#if $commandsCustomized['new.connection']?.enabled}
    <InlineButton on:click={() => runCommand('new.connection')} title="Add new connection">
      <FontIcon icon="icon plus-thick" />
    </InlineButton>
  {/if}
  <InlineButton on:click={handleRefreshConnections} title="Refresh connection list">
    <FontIcon icon="icon refresh" />
  </InlineButton>
</SearchBoxWrapper>
<WidgetsInnerContainer>
  <AppObjectList
    list={_.sortBy(connectionsWithStatus, connection => (getConnectionLabel(connection) || '').toUpperCase())}
    module={connectionAppObject}
    subItemsComponent={SubDatabaseList}
    expandOnClick
    isExpandable={data => $openedConnections.includes(data._id) && !data.singleDatabase}
    {filter}
    passProps={{ connectionColorFactory: $connectionColorFactory, showPinnedInsteadOfUnpin: true }}
  />
  {#if $connections && $connections.length == 0 && $commandsCustomized['new.connection']?.enabled}
    <ToolbarButton icon="icon new-connection" on:click={() => runCommand('new.connection')}>
      Add new connection
    </ToolbarButton>
  {/if}
</WidgetsInnerContainer>
