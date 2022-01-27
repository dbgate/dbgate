<script lang="ts" context="module">
  export const extractKey = data => data.name;
  export const createMatcher = data => filter => filterName(filter, data.name);
</script>

<script lang="ts">
  import _ from 'lodash';
  import { filterName } from 'dbgate-tools';

  import { currentApplication, currentDatabase } from '../stores';

  import AppObjectCore from './AppObjectCore.svelte';
  import { showModal } from '../modals/modalTools';
  import ConfirmModal from '../modals/ConfirmModal.svelte';
  import InputTextModal from '../modals/InputTextModal.svelte';
  import { apiCall } from '../utility/api';

  export let data;

  const handleDelete = () => {
    showModal(ConfirmModal, {
      message: `Really delete application ${data.name}?`,
      onConfirm: () => {
        apiCall('apps/delete-folder', { folder: data.name });
      },
    });
  };

  const handleRename = () => {
    const { name } = data;

    showModal(InputTextModal, {
      value: name,
      label: 'New application name',
      header: 'Rename application',
      onConfirm: async newFolder => {
        await apiCall('apps/rename-folder', {
          folder: data.name,
          newFolder: newFolder,
        });
        if ($currentApplication == data.name) {
          $currentApplication = newFolder;
        }
      },
    });
  };

  function setOnCurrentDb(value) {
    apiCall('connections/update-database', {
      conid: $currentDatabase?.connection?._id,
      database: $currentDatabase?.name,
      values: {
        [`useApp:${data.name}`]: value,
      },
    });
  }

  function createMenu() {
    return [
      { text: 'Delete', onClick: handleDelete },
      { text: 'Rename', onClick: handleRename },

      $currentDatabase && [
        { text: 'Enable on current database', onClick: () => setOnCurrentDb(true) },
        { text: 'Disable on current database', onClick: () => setOnCurrentDb(false) },
      ],
    ];
  }
</script>

<AppObjectCore
  {...$$restProps}
  {data}
  title={data.name}
  icon={'img app'}
  isBold={data.name == $currentApplication}
  on:click={() => ($currentApplication = data.name)}
  menu={createMenu}
/>
