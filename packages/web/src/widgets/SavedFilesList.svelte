<script lang="ts">
  import _ from 'lodash';
  import AppObjectList from '../appobj/AppObjectList.svelte';
  import * as savedFileAppObject from '../appobj/SavedFileAppObject.svelte';
  import CloseSearchButton from '../buttons/CloseSearchButton.svelte';
  import InlineButton from '../buttons/InlineButton.svelte';
  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import { apiCall } from '../utility/api';
  import { useFiles } from '../utility/metadataLoaders';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';
  import getElectron from '../utility/getElectron';
  import InlineButtonLabel from '../buttons/InlineButtonLabel.svelte';
  import resolveApi, { resolveApiHeaders } from '../utility/resolveApi';

  let filter = '';

  const sqlFiles = useFiles({ folder: 'sql' });
  const shellFiles = useFiles({ folder: 'shell' });
  const markdownFiles = useFiles({ folder: 'markdown' });
  const chartFiles = useFiles({ folder: 'charts' });
  const queryFiles = useFiles({ folder: 'query' });
  const sqliteFiles = useFiles({ folder: 'sqlite' });
  const diagramFiles = useFiles({ folder: 'diagrams' });
  const jobFiles = useFiles({ folder: 'jobs' });
  const perspectiveFiles = useFiles({ folder: 'perspectives' });
  const modelTransformFiles = useFiles({ folder: 'modtrans' });

  const electron = getElectron();

  $: files = [
    ...($sqlFiles || []),
    ...($shellFiles || []),
    ...($markdownFiles || []),
    ...($chartFiles || []),
    ...($queryFiles || []),
    ...($sqliteFiles || []),
    ...($diagramFiles || []),
    ...($perspectiveFiles || []),
    ...($jobFiles || []),
    ...($modelTransformFiles || []),
  ];

  function handleRefreshFiles() {
    apiCall('files/refresh', {
      folders: [
        'sql',
        'shell',
        'markdown',
        'charts',
        'query',
        'sqlite',
        'diagrams',
        'perspectives',
        'jobs',
        'modtrans',
      ],
    });
  }

  function dataFolderTitle(folder) {
    if (folder == 'modtrans') return 'Model transforms';
    return _.startCase(folder);
  }

  async function handleUploadedFile(e) {
    const files = [...e.target.files];

    for (const file of files) {
      const formData = new FormData();
      formData.append('name', file.name);
      formData.append('data', file);

      const fetchOptions = {
        method: 'POST',
        body: formData,
        headers: resolveApiHeaders(),
      };

      const apiBase = resolveApi();
      const resp = await fetch(`${apiBase}/uploads/upload-data-file`, fetchOptions);
      const fileData = await resp.json();
    }
  }

  async function handleOpenElectronFile() {
    const filePaths = await electron.showOpenDialog({
      filters: [
        {
          name: `All supported files`,
          extensions: ['sql'],
        },
        { name: `SQL files`, extensions: ['sql'] },
      ],
      properties: ['showHiddenFiles', 'openFile'],
    });
    const filePath = filePaths && filePaths[0];
    await apiCall('uploads/save-data-file', { filePath });
  }
</script>

<WidgetsInnerContainer>
  <SearchBoxWrapper>
    <SearchInput placeholder="Search saved files" bind:value={filter} />
    <CloseSearchButton bind:filter />
    {#if electron}
      <InlineButton on:click={handleOpenElectronFile} title="Add file" data-testid="SavedFileList_buttonAddFile">
        <FontIcon icon="icon plus-thick" />
      </InlineButton>
    {:else}
      <InlineButtonLabel
        on:click={() => {}}
        title="Add file"
        data-testid="SavedFileList_buttonAddFile"
        htmlFor="uploadSavedFileButton"
      >
        <FontIcon icon="icon plus-thick" />
      </InlineButtonLabel>
    {/if}
    <InlineButton on:click={handleRefreshFiles} title="Refresh files" data-testid="SavedFileList_buttonRefresh">
      <FontIcon icon="icon refresh" />
    </InlineButton>
  </SearchBoxWrapper>

  <input type="file" id="uploadSavedFileButton" hidden on:change={handleUploadedFile} />

  <AppObjectList list={files} module={savedFileAppObject} groupFunc={data => dataFolderTitle(data.folder)} {filter} />
</WidgetsInnerContainer>
