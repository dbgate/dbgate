<script lang="ts">
  import _ from 'lodash';

  import AppObjectList from '../appobj/AppObjectList.svelte';
  import * as appFolderAppObject from '../appobj/AppFolderAppObject.svelte';
  import runCommand from '../commands/runCommand';
  import CloseSearchButton from '../buttons/CloseSearchButton.svelte';

  import InlineButton from '../buttons/InlineButton.svelte';

  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import { apiCall } from '../utility/api';
  import { useAppFolders } from '../utility/metadataLoaders';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';

  let filter = '';

  $: folders = useAppFolders();

  const handleRefreshFolders = () => {
    apiCall('apps/refresh-folders');
  };
</script>

<SearchBoxWrapper>
  <SearchInput placeholder="Search applications" bind:value={filter} />
  <CloseSearchButton bind:filter />
  <InlineButton on:click={() => runCommand('new.application')} title="Create new application">
    <FontIcon icon="icon plus-thick" />
  </InlineButton>
  <InlineButton on:click={handleRefreshFolders} title="Refresh application list">
    <FontIcon icon="icon refresh" />
  </InlineButton>
</SearchBoxWrapper>
<WidgetsInnerContainer>
  <AppObjectList list={_.sortBy($folders, 'name')} module={appFolderAppObject} {filter} />
</WidgetsInnerContainer>
