<script lang="ts" context="module">
  export const extractKey = data => data.name;
  export const createMatcher = data => filter => filterName(filter, data.name);
</script>

<script lang="ts">
  import _ from 'lodash';
  import { extractPackageName, filterName } from 'dbgate-tools';

  import { currentArchive, currentDatabase } from '../stores';

  import axiosInstance from '../utility/axiosInstance';
  import openNewTab from '../utility/openNewTab';
  import AppObjectCore from './AppObjectCore.svelte';
  import newQuery from '../query/newQuery';
  import { showModal } from '../modals/modalTools';
  import ConfirmModal from '../modals/ConfirmModal.svelte';
  import InputTextModal from '../modals/InputTextModal.svelte';

  export let data;

  const handleDelete = () => {
    showModal(ConfirmModal, {
      message: `Really delete folder ${data.name}?`,
      onConfirm: () => {
        axiosInstance.post('archive/delete-folder', { folder: data.name });
      },
    });
  };

  const handleRename = () => {
    showModal(InputTextModal, {
      value: data.name,
      label: 'New folder name',
      header: 'Rename folder',
      onConfirm: async newFolder => {
        await axiosInstance.post('archive/rename-folder', {
          folder: data.name,
          newFolder,
        });
        if ($currentArchive == data.name) {
          $currentArchive = newFolder;
        }
      },
    });
  };

  const handleGenerateDeployScript = () => {
    openNewTab(
      {
        title: 'Shell #',
        icon: 'img shell',
        tabComponent: 'ShellTab',
      },
      {
        editor: `// @require ${extractPackageName($currentDatabase.connection.engine)}
        
await dbgateApi.deployDb(${JSON.stringify(
          {
            connection: {
              ..._.omit($currentDatabase.connection, '_id', 'displayName'),
              database: $currentDatabase.name,
            },
            modelFolder: `archive:${data.name}`,
          },
          undefined,
          2
        )})`,
      }
    );
  };

  const handleGenerateDeploySql = async () => {
    const resp = await axiosInstance.post('database-connections/generate-deploy-sql', {
      conid: $currentDatabase.connection._id,
      database: $currentDatabase.name,
      archiveFolder: data.name,
    });

    newQuery({ initialData: resp.data.sql });
  };

  const handleCompareWithCurrentDb = () => {
    openNewTab(
      {
        title: 'Compare',
        icon: 'img compare',
        tabComponent: 'CompareModelTab',
      },
      {
        editor: {
          sourceConid: '__model',
          sourceDatabase: `archive:${data.name}`,
          targetConid: _.get($currentDatabase, 'connection._id'),
          targetDatabase: _.get($currentDatabase, 'name'),
        },
      }
    );
  };

  function createMenu() {
    return [
      data.name != 'default' && { text: 'Delete', onClick: handleDelete },
      data.name != 'default' && { text: 'Rename', onClick: handleRename },
      data.name != 'default' &&
        $currentDatabase && [
          { text: 'Generate deploy DB SQL', onClick: handleGenerateDeploySql },
          { text: 'Shell: Deploy DB', onClick: handleGenerateDeployScript },
        ],

      data.name != 'default' &&
        _.get($currentDatabase, 'connection._id') && {
          onClick: handleCompareWithCurrentDb,
          text: `Compare with ${_.get($currentDatabase, 'name')}`,
        },
    ];
  }
</script>

<AppObjectCore
  {...$$restProps}
  {data}
  title={data.name}
  icon="img archive-folder"
  isBold={data.name == $currentArchive}
  on:click={() => ($currentArchive = data.name)}
  menu={createMenu}
/>
