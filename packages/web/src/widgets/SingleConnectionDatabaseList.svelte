<script lang="ts">
  import _ from 'lodash';
  import InlineButton from '../buttons/InlineButton.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';
  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SubDatabaseList from '../appobj/SubDatabaseList.svelte';
  import { openedConnections } from '../stores';
  import { useConnectionColorFactory } from '../utility/useConnectionColor';
  import FontIcon from '../icons/FontIcon.svelte';
  import CloseSearchButton from '../buttons/CloseSearchButton.svelte';
  import { apiCall } from '../utility/api';

  export let connection;

  let filter = '';

  const handleRefreshDatabases = () => {
    apiCall('server-connections/refresh', { conid: connection._id });
  };
</script>

<SearchBoxWrapper>
  <SearchInput placeholder="Search connection or database" bind:value={filter} />
  <CloseSearchButton bind:filter />
  <InlineButton on:click={handleRefreshDatabases} title="Refresh database list">
    <FontIcon icon="icon refresh" />
  </InlineButton>
</SearchBoxWrapper>
<WidgetsInnerContainer>
  <SubDatabaseList data={connection} {filter} passProps={{}} />
</WidgetsInnerContainer>
