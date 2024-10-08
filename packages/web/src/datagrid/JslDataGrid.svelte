<script lang="ts">
  import { createGridCache, createGridConfig, JslGridDisplay, runMacro, runMacroOnChangeSet } from 'dbgate-datalib';
  import { generateTablePairingId, processJsonDataUpdateCommands } from 'dbgate-tools';
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
  export let infoLoadCounter = 0;

  export let driver;

  let loadedRows;
  let infoCounter = 0;

  $: info = useApiCall('jsldata/get-info', { jslid, infoCounter, infoLoadCounter }, {});

  // $: columns = ($info && $info.columns) || [];
  const config = writable(createGridConfig());
  const cache = writable(createGridCache());

  function handleInitializeFile() {
    infoCounter += 1;
  }

  function handleRunMacro(macro, params, cells) {
    const newChangeSet = runMacroOnChangeSet(macro, params, cells, changeSetState?.value, display, true);
    if (newChangeSet) {
      dispatchChangeSet({ type: 'set', value: newChangeSet });
    }
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

  $: infoWithPairingId = generateTablePairingId($info);
  $: infoUsed = (allowChangeChangeSetStructure && changeSetState?.value?.structure) || infoWithPairingId;

  // $: console.log('infoUsed', infoUsed);

  $: display = new JslGridDisplay(
    jslid,
    infoUsed,
    $config,
    config.update,
    $cache,
    cache.update,
    loadedRows,
    infoUsed?.__isDynamicStructure,
    supportsReload,
    !!changeSetState,
    driver
  );

  function handleSetLoadedRows(rows) {
    loadedRows = rows;
  }
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
    setLoadedRows={handleSetLoadedRows}
    isDynamicStructure={!!infoUsed?.__isDynamicStructure}
    showMacros={!!dispatchChangeSet}
    expandMacros={!!dispatchChangeSet}
    onRunMacro={handleRunMacro}
    macroCondition={infoUsed?.__isDynamicStructure ? null : macro => macro.type == 'transformValue'}
    hasMultiColumnFilter
    {changeSetState}
    {changeSetStore}
    {dispatchChangeSet}
    {allowChangeChangeSetStructure}
    preprocessLoadedRow={changeSetState?.value?.dataUpdateCommands
      ? row => processJsonDataUpdateCommands(row, changeSetState?.value?.dataUpdateCommands)
      : null}
    dataEditorTypesBehaviourOverride={driver
      ? null
      : {
          parseJsonNull: true,
          parseJsonBoolean: true,
          parseNumber: true,
          parseJsonArray: true,
          parseJsonObject: true,

          explicitDataType: true,

          supportNumberType: true,
          supportStringType: true,
          supportBooleanType: true,
          supportNullType: true,
          supportJsonType: true,

          supportFieldRemoval: true,
        }}
  />
{/key}
