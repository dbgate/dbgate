<script lang="ts">
  import _ from 'lodash';

  import AppObjectList from '../appobj/AppObjectList.svelte';
  import * as archiveFolderAppObject from '../appobj/ArchiveFolderAppObject.svelte';

  import InlineButton from '../elements/InlineButton.svelte';

  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import axiosInstance from '../utility/axiosInstance';
  import { useArchiveFolders } from '../utility/metadataLoaders';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';

  let filter = '';

  $: folders = useArchiveFolders();

  const handleRefreshFolders = () => {
    axiosInstance.post('archive/refresh-folders', {});
  };
</script>

<SearchBoxWrapper>
  <SearchInput placeholder="Search archive folders" bind:value={filter} />
  <InlineButton on:click={handleRefreshFolders}>Refresh</InlineButton>
</SearchBoxWrapper>
<WidgetsInnerContainer>
  <AppObjectList list={_.sortBy($folders, 'name')} module={archiveFolderAppObject} {filter} />
</WidgetsInnerContainer>
