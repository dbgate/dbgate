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
  import { useFiles, useTeamFiles } from '../utility/metadataLoaders';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';
  import { isProApp } from '../utility/proTools';
  import InlineUploadButton from '../buttons/InlineUploadButton.svelte';
  import { DATA_FOLDER_NAMES } from 'dbgate-tools';
  import { _t } from '../translations';

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
  const appFiles = useFiles({ folder: 'apps' });
  const teamFiles = useTeamFiles({});

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
    ...((isProApp() && $appFiles) || []),
    ...($teamFiles || []),
  ];

  function handleRefreshFiles() {
    apiCall('files/refresh', {
      folders: DATA_FOLDER_NAMES.map(folder => folder.name),
    });
  }

  function dataFolderTitle(folder) {
    const foundFolder = DATA_FOLDER_NAMES.find(f => f.name === folder);
    return foundFolder ? foundFolder.label : _.startCase(folder);
  }

  async function handleUploadedFile(filePath, fileName) {
    await apiCall('files/save-uploaded-file', { filePath, fileName });
  }
</script>

<SearchBoxWrapper>
  <SearchInput placeholder={_t('files.searchSavedFiles', { defaultMessage: "Search saved files" })} bind:value={filter} />
  <CloseSearchButton bind:filter />
  <InlineUploadButton
    filters={[
      {
        name: _t('files.allSupportedFiles', { defaultMessage: "All supported files" }),
        extensions: ['sql'],
      },
      { name: _t('files.sqlFiles', { defaultMessage: "SQL files" }), extensions: ['sql'] },
    ]}
    onProcessFile={handleUploadedFile}
  />
  <InlineButton on:click={handleRefreshFiles} title={_t('files.refreshFiles', { defaultMessage: "Refresh files" })} data-testid="SavedFileList_buttonRefresh">
    <FontIcon icon="icon refresh" />
  </InlineButton>
</SearchBoxWrapper>

<WidgetsInnerContainer>
  <AppObjectList
    list={files}
    module={savedFileAppObject}
    groupFunc={data => (data.teamFileId ? _t('files.teamFiles', { defaultMessage: "Team files" }) : dataFolderTitle(data.folder))}
    {filter}
  />
</WidgetsInnerContainer>
