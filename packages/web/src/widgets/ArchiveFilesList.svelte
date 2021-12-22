<script lang="ts" context="module">
  const ARCHIVE_LABELS = {
    jsonl: 'JSON table data',
    'table.yaml': 'Tables',
    'view.sql': 'Views',
    'proc.sql': 'Procedures',
    'func.sql': 'Functions',
    'trigger.sql': 'Triggers',
    'matview.sql': 'Materialized views',
  };
</script>

<script lang="ts">
  import { createFreeTableModel } from 'dbgate-datalib';

  import _ from 'lodash';

  import AppObjectList from '../appobj/AppObjectList.svelte';
  import * as archiveFileAppObject from '../appobj/ArchiveFileAppObject.svelte';
  import CloseSearchButton from '../elements/CloseSearchButton.svelte';
  import DropDownButton from '../elements/DropDownButton.svelte';

  import InlineButton from '../elements/InlineButton.svelte';

  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import InputTextModal from '../modals/InputTextModal.svelte';
  import { showModal } from '../modals/modalTools';
  import { currentArchive } from '../stores';
  import { apiCall } from '../utility/api';
  import { markArchiveFileAsDataSheet } from '../utility/archiveTools';
  import axiosInstance from '../utility/axiosInstance';
  import { useArchiveFiles, useArchiveFolders } from '../utility/metadataLoaders';
  import openNewTab from '../utility/openNewTab';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';

  let filter = '';

  $: folder = $currentArchive;
  $: files = useArchiveFiles({ folder });

  const handleRefreshFiles = () => {
    apiCall('archive/refresh-files', { folder });
  };

  function handleNewDataSheet() {
    showModal(InputTextModal, {
      value: '',
      label: 'New file name',
      header: 'Create new data sheet',
      onConfirm: async file => {
        await apiCall('archive/save-free-table', {
          folder: $currentArchive,
          file,
          data: createFreeTableModel(),
        });
        markArchiveFileAsDataSheet($currentArchive, file);

        openNewTab({
          title: file,
          icon: 'img free-table',
          tabComponent: 'FreeTableTab',
          props: {
            initialArgs: {
              functionName: 'archiveReader',
              props: {
                fileName: file,
                folderName: $currentArchive,
              },
            },
            archiveFile: file,
            archiveFolder: $currentArchive,
          },
        });
      },
    });
  }

  function createAddMenu() {
    return [{ text: 'New data sheet', onClick: handleNewDataSheet }];
  }
</script>

<SearchBoxWrapper>
  <SearchInput placeholder="Search archive files" bind:value={filter} />

  <CloseSearchButton bind:filter />
  <DropDownButton icon="icon plus-thick" menu={createAddMenu} />
  <InlineButton on:click={handleRefreshFiles} title="Refresh files of selected archive folder">
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
    groupFunc={data => ARCHIVE_LABELS[data.fileType] || 'Archive'}
    module={archiveFileAppObject}
    {filter}
  />
</WidgetsInnerContainer>
