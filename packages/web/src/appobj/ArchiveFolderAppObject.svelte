<script lang="ts" context="module">
  export const extractKey = data => data.name;
  export const createMatcher = filter => data => filterName(filter, data.name);
</script>

<script lang="ts">
  import _ from 'lodash';
  import { extractPackageName, filterName } from 'dbgate-tools';

  import { currentArchive, currentDatabase } from '../stores';

  import openNewTab from '../utility/openNewTab';
  import AppObjectCore from './AppObjectCore.svelte';
  import newQuery from '../query/newQuery';
  import { showModal } from '../modals/modalTools';
  import ConfirmModal from '../modals/ConfirmModal.svelte';
  import InputTextModal from '../modals/InputTextModal.svelte';
  import ErrorMessageModal from '../modals/ErrorMessageModal.svelte';
  import { apiCall } from '../utility/api';
  import hasPermission from '../utility/hasPermission';
  import { isProApp } from '../utility/proTools';
  import { extractShellConnection } from '../impexp/createImpExpScript';

  export let data;

  const handleDelete = () => {
    showModal(ConfirmModal, {
      message: data.name.endsWith('.link')
        ? `Really delete link to folder ${data.name}? Folder content remains untouched.`
        : `Really delete folder ${data.name}?`,
      onConfirm: () => {
        apiCall('archive/delete-folder', { folder: data.name });
      },
    });
  };

  const handleRename = () => {
    const isLink = data.name.endsWith('.link');
    const name = isLink ? data.name.slice(0, -5) : data.name;
    const suffix = isLink ? '.link' : '';

    showModal(InputTextModal, {
      value: name,
      label: 'New folder name',
      header: 'Rename folder',
      onConfirm: async newFolder => {
        await apiCall('archive/rename-folder', {
          folder: data.name,
          newFolder: newFolder + suffix,
        });
        if ($currentArchive == data.name) {
          $currentArchive = newFolder + suffix;
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
            connection: extractShellConnection($currentDatabase.connection, $currentDatabase.name),
            modelFolder: `archive:${data.name}`,
          },
          undefined,
          2
        )})`,
      }
    );
  };

  const handleGenerateDeploySql = async () => {
    const resp = await apiCall('database-connections/generate-deploy-sql', {
      conid: $currentDatabase.connection._id,
      database: $currentDatabase.name,
      archiveFolder: data.name,
    });

    if (resp.errorMessage) {
      showModal(ErrorMessageModal, { message: resp.errorMessage });
    } else {
      newQuery({ initialData: resp.sql });
    }
  };

  const handleCompareWithCurrentDb = () => {
    openNewTab(
      {
        title: 'Compare',
        icon: 'img compare',
        tabComponent: 'CompareModelTab',
        props: {
          conid: $currentDatabase?.connection?._id,
          database: $currentDatabase?.name,
        }
      },
      {
        editor: {
          sourceConid: '__model',
          sourceDatabase: `archive:${data.name}`,
          targetConid: $currentDatabase?.connection?._id,
          targetDatabase: $currentDatabase?.name,
        },
      }
    );
  };

  const handleOpenDuplicatorTab = () => {
    openNewTab(
      {
        title: data.name,
        icon: 'img duplicator',
        tabComponent: 'DataDuplicatorTab',
        props: {
          conid: $currentDatabase?.connection?._id,
          database: $currentDatabase?.name,
        },
      },
      {
        editor: {
          archiveFolder: data.name,
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
          { text: 'Data duplicator', onClick: handleOpenDuplicatorTab },
          { text: 'Generate deploy DB SQL', onClick: handleGenerateDeploySql },
          { text: 'Shell: Deploy DB', onClick: handleGenerateDeployScript },
        ],

      data.name != 'default' &&
        hasPermission('dbops/model/compare') &&
        isProApp() &&
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
  title={data.name.endsWith('.link') ? data.name.slice(0, -5) : data.name}
  icon={data.name.endsWith('.link') ? 'img link' : 'img archive-folder'}
  isBold={data.name == $currentArchive}
  on:click={() => ($currentArchive = data.name)}
  menu={createMenu}
/>
