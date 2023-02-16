<script lang="ts">
  import { createGridCache, createGridConfig, JslGridDisplay } from 'dbgate-datalib';
  import { generateTablePairingId } from 'dbgate-tools';
  import { writable } from 'svelte/store';
  import JslFormView from '../formview/JslFormView.svelte';
  import { apiOff, apiOn, useApiCall } from '../utility/api';
  import useEffect from '../utility/useEffect';

  import DataGrid from './DataGrid.svelte';
  import JslDataGridCore from './JslDataGridCore.svelte';

  export let jslid;
  export let supportsReload = false;
  export let listenInitializeFile = false;

  export let changeSetState = null;
  export let changeSetStore = null;
  export let dispatchChangeSet = null;

  export let allowChangeChangeSetStructure = false;

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
    (allowChangeChangeSetStructure && changeSetState?.value?.structure) || generateTablePairingId($info),
    $config,
    config.update,
    $cache,
    cache.update,
    loadedRows,
    $info?.__isDynamicStructure,
    supportsReload,
    !!changeSetState
  );
</script>

{#key jslid}
  <DataGrid
    {...$$restProps}
    {display}
    {jslid}
    config={$config}
    setConfig={config.update}
    gridCoreComponent={JslDataGridCore}
    formViewComponent={JslFormView}
    bind:loadedRows
    isDynamicStructure={$info?.__isDynamicStructure}
    useEvalFilters
    {changeSetState}
    {changeSetStore}
    {dispatchChangeSet}
    {allowChangeChangeSetStructure}
  />
{/key}
