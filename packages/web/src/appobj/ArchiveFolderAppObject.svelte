<script lang="ts" context="module">
  export const extractKey = data => data.name;
  export const createMatcher = data => filter => filterName(filter, data.name);
</script>

<script lang="ts">
  import { filterName } from 'dbgate-datalib';

  import { currentArchive } from '../stores';

  import axiosInstance from '../utility/axiosInstance';
  import AppObjectCore from './AppObjectCore.svelte';

  export let data;

  const handleDelete = () => {
    axiosInstance.post('archive/delete-folder', { folder: data.name });
  };

  function createMenu() {
    return [data.name != 'default' && { text: 'Delete', onClick: handleDelete }];
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
