<script lang="ts">
  import _ from 'lodash';

  import AppObjectList from '../appobj/AppObjectList.svelte';
  import * as archiveFolderAppObject from '../appobj/ArchiveFolderAppObject.svelte';
  import runCommand from '../commands/runCommand';
  import CloseSearchButton from '../buttons/CloseSearchButton.svelte';

  import InlineButton from '../buttons/InlineButton.svelte';

  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import { apiCall } from '../utility/api';
  import { useArchiveFolders } from '../utility/metadataLoaders';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';
  import InlineUploadButton from '../buttons/InlineUploadButton.svelte';
  import { isProApp } from '../utility/proTools';

  let filter = '';

  $: folders = useArchiveFolders();

  const handleRefreshFolders = () => {
    apiCall('archive/refresh-folders');
  };

  async function handleUploadedFile(filePath, fileName) {
    await apiCall('archive/save-uploaded-zip', { filePath, fileName });
  }
</script>

<SearchBoxWrapper>
  <SearchInput placeholder="Search archive folders" bind:value={filter} />
  <CloseSearchButton bind:filter />

  {#if isProApp()}
    <InlineUploadButton
      icon="icon upload"
      filters={[
        {
          name: `All supported files`,
          extensions: ['zip'],
        },
        { name: `ZIP files`, extensions: ['zip'] },
      ]}
      onProcessFile={handleUploadedFile}
    />
  {/if}

  <!-- {#if electron}
    <InlineButton on:click={handleOpenElectronFile} title="Add file" data-testid="ArchiveFolderList_uploadZipFile">
      <FontIcon icon="icon plus-thick" />
    </InlineButton>
  {:else}
    <InlineButtonLabel
      on:click={() => {}}
      title="Add file"
      data-testid="ArchiveFolderList_uploadZipFile"
      htmlFor="uploadZipFileButton"
    >
      <FontIcon icon="icon plus-thick" />
    </InlineButtonLabel>
  {/if}

  <input type="file" id="uploadZipFileButton" hidden on:change={handleUploadedFile} /> -->

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
