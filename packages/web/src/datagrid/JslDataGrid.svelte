<script lang="ts">
  import { createGridCache, createGridConfig, JslGridDisplay } from 'dbgate-datalib';
  import { writable } from 'svelte/store';
  import socket from '../utility/socket';
  import useEffect from '../utility/useEffect';

  import useFetch from '../utility/useFetch';
  import DataGrid from './DataGrid.svelte';
  import JslDataGridCore from './JslDataGridCore.svelte';

  export let jslid;

  let loadedRows;

  $: info = useFetch({
    params: { jslid },
    url: 'jsldata/get-info',
    defaultValue: {},
  });

  // $: columns = ($info && $info.columns) || [];
  const config = writable(createGridConfig());
  const cache = writable(createGridCache());

  $: display = new JslGridDisplay(jslid, $info, $config, config.update, $cache, cache.update, loadedRows);
</script>

{#key jslid}
  <DataGrid
    {display}
    {jslid}
    gridCoreComponent={JslDataGridCore}
    bind:loadedRows
    isDynamicStructure={$info?.__isDynamicStructure}
  />
{/key}
