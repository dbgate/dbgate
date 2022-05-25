<script lang="ts">
  import _ from 'lodash';
  import InlineButton from '../buttons/InlineButton.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';
  import { useConnectionList, useServerStatus } from '../utility/metadataLoaders';
  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import AppObjectList from '../appobj/AppObjectList.svelte';
  import * as connectionAppObject from '../appobj/ConnectionAppObject.svelte';
  import SubDatabaseList from '../appobj/SubDatabaseList.svelte';
  import { commands, commandsCustomized, expandedConnections, openedConnections, openedTabs } from '../stores';
  import ToolbarButton from '../buttons/ToolbarButton.svelte';
  import runCommand from '../commands/runCommand';
  import getConnectionLabel from '../utility/getConnectionLabel';
  import { useConnectionColorFactory } from '../utility/useConnectionColor';
  import FontIcon from '../icons/FontIcon.svelte';
  import CloseSearchButton from '../buttons/CloseSearchButton.svelte';
  import { apiCall } from '../utility/api';
  import LargeButton from '../buttons/LargeButton.svelte';
  import { matchingProps } from '../tabs/TableDataTab.svelte';

  const connections = useConnectionList();
  const serverStatus = useServerStatus();

  let filter = '';

  $: connectionsWithStatus =
    $connections && $serverStatus
      ? $connections.map(conn => ({ ...conn, status: $serverStatus[conn._id] }))
      : $connections;

  $: connectionsWithStatusFiltered = connectionsWithStatus?.filter(
    x => !x.unsaved || $openedConnections.includes(x._id)
  );

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
    list={_.sortBy(connectionsWithStatusFiltered, connection => (getConnectionLabel(connection) || '').toUpperCase())}
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
