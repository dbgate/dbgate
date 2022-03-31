<script lang="ts">
  import { createGridCache, createGridConfig, JslGridDisplay } from 'dbgate-datalib';
  import { writable } from 'svelte/store';
  import { apiOff, apiOn, useApiCall } from '../utility/api';
  import useEffect from '../utility/useEffect';

  import DataGrid from './DataGrid.svelte';
  import JslDataGridCore from './JslDataGridCore.svelte';

  export let jslid;
  export let supportsReload = false;
  export let listenInitializeFile = false;

  let loadedRows;
  let infoCounter = 0;

  $: info = useApiCall('jsldata/get-info', { jslid, infoCounter }, {});

  // $: columns = ($info && $info.columns) || [];
  const config = writable(createGridConfig());
  const cache = writable(createGridCache());

  function handleInitializeFile() {
    infoCounter += 1;
  }

  $: effect = useEffect(() => onJslId(jslid));
  function onJslId(jslidVal) {
    if (jslidVal && listenInitializeFile) {
      apiOn(`session-initialize-file-${jslidVal}`, handleInitializeFile);
      return () => {
        apiOff(`session-initialize-file-${jslidVal}`, handleInitializeFile);
      };
    } else {
      return () => {};
    }
  }
  $: $effect;

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
    useEvalFilters
  />
{/key}
