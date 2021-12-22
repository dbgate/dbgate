<script lang="ts">
  import _ from 'lodash';

  import AppObjectList from '../appobj/AppObjectList.svelte';
  import * as archiveFolderAppObject from '../appobj/ArchiveFolderAppObject.svelte';
  import runCommand from '../commands/runCommand';
  import CloseSearchButton from '../elements/CloseSearchButton.svelte';

  import InlineButton from '../elements/InlineButton.svelte';

  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
import { apiCall } from '../utility/api';
  import axiosInstance from '../utility/axiosInstance';
  import { useArchiveFolders } from '../utility/metadataLoaders';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';

  let filter = '';

  $: folders = useArchiveFolders();

  const handleRefreshFolders = () => {
    apiCall('archive/refresh-folders');
  };
</script>

<SearchBoxWrapper>
  <SearchInput placeholder="Search archive folders" bind:value={filter} />
  <CloseSearchButton bind:filter />
  <InlineButton on:click={() => runCommand('new.archiveFolder')} title="Add new archive folder">
    <FontIcon icon="icon plus-thick" />
  </InlineButton>
  <InlineButton on:click={handleRefreshFolders} title="Refresh archive folder list">
    <FontIcon icon="icon refresh" />
  </InlineButton>
</SearchBoxWrapper>
<WidgetsInnerContainer>
  <AppObjectList list={_.sortBy($folders, 'name')} module={archiveFolderAppObject} {filter} />
</WidgetsInnerContainer>
