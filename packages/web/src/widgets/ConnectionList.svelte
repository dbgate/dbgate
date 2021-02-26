<script lang="ts">
  import _ from 'lodash';
  import InlineButton from './InlineButton.svelte';
  import SearchInput from './SearchInput.svelte';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';
  import { useConnectionList, useServerStatus } from '../utility/metadataLoaders';
  import SearchBoxWrapper from './SearchBoxWrapper.svelte';
  import AppObjectList from '../appobj/AppObjectList.svelte';
  import ConnectionAppObject from '../appobj/ConnectionAppObject.svelte';
  import SubDatabaseList from '../appobj/SubDatabaseList.svelte';

  const connections = useConnectionList();
  const serverStatus = useServerStatus();

  $: connectionsWithStatus =
    $connections && $serverStatus
      ? $connections.map(conn => ({ ...conn, status: $serverStatus[conn._id] }))
      : $connections;
</script>

<SearchBoxWrapper>
  <SearchInput placeholder="Search connection" />
  <InlineButton>Refresh</InlineButton>
</SearchBoxWrapper>
<WidgetsInnerContainer>
  <AppObjectList
    list={_.sortBy(connectionsWithStatus, ({ displayName, server }) => (displayName || server || '').toUpperCase())}
    component={ConnectionAppObject}
    subItemsComponent={SubDatabaseList}
    expandOnClick
  />
</WidgetsInnerContainer>
