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

  const connections = useConnectionList();
  const serverStatus = useServerStatus();

  let filter = '';

  $: connectionsWithStatus =
    $connections && $serverStatus
      ? $connections.map(conn => ({ ...conn, status: $serverStatus[conn._id] }))
      : $connections;

  const handleRefreshConnections = () => {
    for (const conid of $openedConnections) {
      axiosInstance.post('server-connections/refresh', { conid });
    }
  };
</script>

<SearchBoxWrapper>
  <SearchInput placeholder="Search connection" bind:value={filter} />
  <InlineButton on:click={handleRefreshConnections}>Refresh</InlineButton>
</SearchBoxWrapper>
<WidgetsInnerContainer>
  <AppObjectList
    list={_.sortBy(connectionsWithStatus, ({ displayName, server }) => (displayName || server || '').toUpperCase())}
    module={connectionAppObject}
    subItemsComponent={SubDatabaseList}
    expandOnClick
    isExpandable={data => $openedConnections.includes(data._id)}
    {filter}
  />
  {#if $connections && $connections.length == 0 && $commandsCustomized['new.connection']?.enabled}
    <ToolbarButton icon="icon new-connection" on:click={() => runCommand('new.connection')}>
      Add new connection
    </ToolbarButton>
  {/if}
</WidgetsInnerContainer>
