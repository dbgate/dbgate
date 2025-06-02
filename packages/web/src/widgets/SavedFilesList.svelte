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
  import { isProApp } from '../utility/proTools';
  import InlineUploadButton from '../buttons/InlineUploadButton.svelte';

  let filter = '';

  const sqlFiles = useFiles({ folder: 'sql' });
  const shellFiles = useFiles({ folder: 'shell' });
  const markdownFiles = useFiles({ folder: 'markdown' });
  const chartFiles = useFiles({ folder: 'charts' });
  const queryFiles = useFiles({ folder: 'query' });
  const sqliteFiles = useFiles({ folder: 'sqlite' });
  const diagramFiles = useFiles({ folder: 'diagrams' });
  const importExportJobFiles = useFiles({ folder: 'impexp' });
  const dataDeployJobFiles = useFiles({ folder: 'datadeploy' });
  const dbCompareJobFiles = useFiles({ folder: 'dbcompare' });
  const perspectiveFiles = useFiles({ folder: 'perspectives' });
  const modelTransformFiles = useFiles({ folder: 'modtrans' });

  $: files = [
    ...($sqlFiles || []),
    ...($shellFiles || []),
    ...($markdownFiles || []),
    ...($chartFiles || []),
    ...($queryFiles || []),
    ...($sqliteFiles || []),
    ...($diagramFiles || []),
    ...($perspectiveFiles || []),
    ...($importExportJobFiles || []),
    ...($modelTransformFiles || []),
    ...((isProApp() && $dataDeployJobFiles) || []),
    ...((isProApp() && $dbCompareJobFiles) || []),
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
        'impexp',
        'modtrans',
        'datadeploy',
        'dbcompare',
      ],
    });
  }

  function dataFolderTitle(folder) {
    if (folder == 'modtrans') return 'Model transforms';
    if (folder == 'datadeploy') return 'Data deploy jobs';
    if (folder == 'dbcompare') return 'Database compare jobs';
    return _.startCase(folder);
  }

  async function handleUploadedFile(filePath, fileName) {
    await apiCall('files/save-uploaded-file', { filePath, fileName });
  }
</script>

<SearchBoxWrapper>
  <SearchInput placeholder="Search saved files" bind:value={filter} />
  <CloseSearchButton bind:filter />
  <InlineUploadButton
    filters={[
      {
        name: `All supported files`,
        extensions: ['sql'],
      },
      { name: `SQL files`, extensions: ['sql'] },
    ]}
    onProcessFile={handleUploadedFile}
  />
  <InlineButton on:click={handleRefreshFiles} title="Refresh files" data-testid="SavedFileList_buttonRefresh">
    <FontIcon icon="icon refresh" />
  </InlineButton>
</SearchBoxWrapper>

<WidgetsInnerContainer>
  <AppObjectList list={files} module={savedFileAppObject} groupFunc={data => dataFolderTitle(data.folder)} {filter} />
</WidgetsInnerContainer>
