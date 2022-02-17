<script lang="ts">
  import { createGridCache, createGridConfig, JslGridDisplay } from 'dbgate-datalib';
  import { writable } from 'svelte/store';
  import { useApiCall } from '../utility/api';

  import DataGrid from './DataGrid.svelte';
  import JslDataGridCore from './JslDataGridCore.svelte';

  export let jslid;
  export let supportsReload;

  let loadedRows;

  $: info = useApiCall('jsldata/get-info', { jslid }, {});

  // $: columns = ($info && $info.columns) || [];
  const config = writable(createGridConfig());
  const cache = writable(createGridCache());

  $: display = new JslGridDisplay(
    jslid,
    $info,
    $config,
    config.update,
    $cache,
    cache.update,
    loadedRows,
    $info?.__isDynamicStructure,
    supportsReload
  );
</script>

{#key jslid}
  <DataGrid
    {...$$restProps}
    {display}
    {jslid}
    gridCoreComponent={JslDataGridCore}
    bind:loadedRows
    isDynamicStructure={$info?.__isDynamicStructure}
  />
{/key}
