<script lang="ts">
  import _ from 'lodash';

  import AppObjectList from '../appobj/AppObjectList.svelte';
  import * as archiveFileAppObject from '../appobj/ArchiveFileAppObject.svelte';

  import InlineButton from '../elements/InlineButton.svelte';

  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import { currentArchive } from '../stores';
  import axiosInstance from '../utility/axiosInstance';
  import { useArchiveFiles, useArchiveFolders } from '../utility/metadataLoaders';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';

  let filter = '';

  $: folder = $currentArchive;
  $: files = useArchiveFiles({ folder });

  const handleRefreshFiles = () => {
    axiosInstance.post('archive/refresh-files', { folder });
  };
</script>

<SearchBoxWrapper>
  <SearchInput placeholder="Search archive files" bind:value={filter} />
  <InlineButton on:click={handleRefreshFiles}>Refresh</InlineButton>
</SearchBoxWrapper>
<WidgetsInnerContainer>
  <AppObjectList
    list={($files || []).map(file => ({
      fileName: file.name,
      folderName: folder,
    }))}
    module={archiveFileAppObject}
    {filter}
  />
</WidgetsInnerContainer>
