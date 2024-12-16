<script lang="ts" context="module">
  export const extractKey = data => data.name;
  export const createMatcher = filter => data => filterName(filter, data.name);
</script>

<script lang="ts">
  import _, { find } from 'lodash';
  import { filterName } from 'dbgate-tools';

  import { currentApplication, currentDatabase } from '../stores';

  import AppObjectCore from './AppObjectCore.svelte';
  import { showModal } from '../modals/modalTools';
  import ConfirmModal from '../modals/ConfirmModal.svelte';
  import InputTextModal from '../modals/InputTextModal.svelte';
  import { apiCall } from '../utility/api';
  import { useConnectionList } from '../utility/metadataLoaders';

  export let data;

  $: connections = useConnectionList();

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
        !isOnCurrentDb($currentDatabase, $connections) && {
          text: 'Enable on current database',
          onClick: () => setOnCurrentDb(true),
        },
        isOnCurrentDb($currentDatabase, $connections) && {
          text: 'Disable on current database',
          onClick: () => setOnCurrentDb(false),
        },
      ],
    ];
  }

  function isOnCurrentDb(currentDb, connections) {
    if (!currentDb || !connections) return false;
    const conn = connections.find(x => x._id == currentDb?.connection?._id);
    const db = conn?.databases?.find(x => x.name == currentDb?.name);
    return db && db[`useApp:${data.name}`];
  }
</script>

<AppObjectCore
  {...$$restProps}
  {data}
  title={data.name}
  icon={'img app'}
  statusIcon={isOnCurrentDb($currentDatabase, $connections) ? 'icon check' : null}
  statusTitle={`Application ${data.name} is used for database ${$currentDatabase?.name}`}
  isBold={data.name == $currentApplication}
  on:click={() => ($currentApplication = data.name)}
  menu={createMenu}
/>
