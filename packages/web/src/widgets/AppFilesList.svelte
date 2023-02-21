<script lang="ts" context="module">
  const APP_LABELS = {
    'command.sql': 'SQL commands',
    'query.sql': 'SQL queries',
  };

  const COMMAND_TEMPLATE = `-- Write SQL command here
-- After save, you can execute it from database context menu, for all databases, which use this application
`;

  const QUERY_TEMPLATE = `-- Write SQL query here
-- After save, you can view it in tables list, for all databases, which use this application
`;
</script>

<script lang="ts">
  import { createFreeTableModel } from 'dbgate-datalib';

  import _ from 'lodash';

  import AppObjectList from '../appobj/AppObjectList.svelte';
  import * as appFileAppObject from '../appobj/AppFileAppObject.svelte';
  import CloseSearchButton from '../buttons/CloseSearchButton.svelte';
  import DropDownButton from '../buttons/DropDownButton.svelte';

  import InlineButton from '../buttons/InlineButton.svelte';

  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import InputTextModal from '../modals/InputTextModal.svelte';
  import { showModal } from '../modals/modalTools';
  import newQuery from '../query/newQuery';
  import { currentApplication } from '../stores';
  import { apiCall } from '../utility/api';
  import { useAppFiles, useArchiveFolders } from '../utility/metadataLoaders';
  import openNewTab from '../utility/openNewTab';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';
  import { showSnackbarError } from '../utility/snackbar';

  let filter = '';

  $: folder = $currentApplication;
  $: files = useAppFiles({ folder });

  const handleRefreshFiles = () => {
    apiCall('apps/refresh-files', { folder });
  };

  function handleNewSqlFile(fileType, header, initialData) {
    showModal(InputTextModal, {
      value: '',
      label: 'New file name',
      header,
      onConfirm: async file => {
        newQuery({
          title: file,
          initialData,
          // @ts-ignore
          savedFile: file + '.' + fileType,
          savedFolder: 'app:' + $currentApplication,
          savedFormat: 'text',
          appFolder: $currentApplication,
        });
      },
    });
  }

  async function handleNewConfigFile(fileName, content) {
    if (!(await apiCall('apps/create-config-file', { fileName, content, appFolder: $currentApplication }))) {
      showSnackbarError('File not created, probably already exists');
    }
  }

  function createAddMenu() {
    return [
      {
        text: 'New SQL command',
        onClick: () => handleNewSqlFile('command.sql', 'Create new SQL command', COMMAND_TEMPLATE),
      },
      {
        text: 'New SQL query',
        onClick: () => handleNewSqlFile('query.sql', 'Create new SQL query', QUERY_TEMPLATE),
      },
      {
        text: 'New virtual references file',
        onClick: () => handleNewConfigFile('virtual-references.config.json', []),
      },
      {
        text: 'New dictionary descriptions file',
        onClick: () => handleNewConfigFile('dictionary-descriptions.config.json', []),
      },

      // { text: 'New query view', onClick: () => handleNewSqlFile('query.sql', 'Create new SQL query', QUERY_TEMPLATE) },
    ];
  }
</script>

<SearchBoxWrapper>
  <SearchInput placeholder="Search application files" bind:value={filter} />

  <CloseSearchButton bind:filter />
  <DropDownButton icon="icon plus-thick" menu={createAddMenu} />
  <InlineButton on:click={handleRefreshFiles} title="Refresh files of selected application">
    <FontIcon icon="icon refresh" />
  </InlineButton>
</SearchBoxWrapper>
<WidgetsInnerContainer>
  <AppObjectList
    list={($files || []).map(file => ({
      fileName: file.name,
      folderName: folder,
      fileType: file.type,
      fileLabel: file.label,
    }))}
    groupFunc={data => APP_LABELS[data.fileType] || 'App config'}
    module={appFileAppObject}
    {filter}
  />
</WidgetsInnerContainer>
