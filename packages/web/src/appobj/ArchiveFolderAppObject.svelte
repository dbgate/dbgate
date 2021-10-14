<script lang="ts" context="module">
  export const extractKey = data => data.name;
  export const createMatcher = data => filter => filterName(filter, data.name);
</script>

<script lang="ts">
  import _ from 'lodash';
  import { filterName } from 'dbgate-tools';

  import { currentArchive, currentDatabase } from '../stores';

  import axiosInstance from '../utility/axiosInstance';
  import openNewTab from '../utility/openNewTab';
  import AppObjectCore from './AppObjectCore.svelte';
  import newQuery from '../query/newQuery';

  export let data;

  const handleDelete = () => {
    axiosInstance.post('archive/delete-folder', { folder: data.name });
  };

  const handleGenerateDeployScript = () => {
    openNewTab(
      {
        title: 'Shell #',
        icon: 'img shell',
        tabComponent: 'ShellTab',
      },
      {
        editor: `await dbgateApi.deployDb(${JSON.stringify(
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

  function createMenu() {
    return [
      data.name != 'default' && { text: 'Delete', onClick: handleDelete },
      data.name != 'default' &&
        $currentDatabase && [
          { text: 'Generate deploy DB SQL', onClick: handleGenerateDeploySql },
          { text: 'Shell: Deploy DB', onClick: handleGenerateDeployScript },
        ],
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
