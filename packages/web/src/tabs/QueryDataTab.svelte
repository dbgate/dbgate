<script lang="ts" context="module">
  export const matchingProps = ['conid', 'database', 'pureName', 'sql'];

  const getCurrentEditor = () => getActiveComponent('QueryDataTab');

  registerCommand({
    id: 'queryData.stopLoading',
    category: 'Query data',
    name: 'Stop loading',
    icon: 'icon stop',
    testEnabled: () => getCurrentEditor()?.isLoading(),
    onClick: () => getCurrentEditor().stopLoading(),
  });
</script>

<script lang="ts">
  import { onDestroy } from 'svelte';

  import ToolStripCommandButton from '../buttons/ToolStripCommandButton.svelte';

  import ToolStripContainer from '../buttons/ToolStripContainer.svelte';
  import ToolStripExportButton, { createQuickExportHandlerRef } from '../buttons/ToolStripExportButton.svelte';
  import invalidateCommands from '../commands/invalidateCommands';
  import registerCommand from '../commands/registerCommand';

  import JslDataGrid from '../datagrid/JslDataGrid.svelte';
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import { apiCall, apiOff, apiOn } from '../utility/api';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import useEffect from '../utility/useEffect';
  import { getSqlFrontMatter } from 'dbgate-tools';
  import yaml from 'js-yaml';
  import JslChart from '../charts/JslChart.svelte';
  import ToolStripButton from '../buttons/ToolStripButton.svelte';

  export const activator = createActivator('QueryDataTab', true);

  export let sql = undefined;
  export let pureName = undefined;
  export let schemaName = undefined;
  export let conid;
  export let database;

  let jslid;
  let loading = false;

  $: frontMatter = getSqlFrontMatter(sql, yaml);

  async function loadData(conid, database, sql) {
    const resp = await apiCall('sessions/execute-reader', {
      conid,
      database,
      sql,
      appFolder: schemaName,
      queryName: pureName,
    });
    jslid = resp.jslid;
    loading = true;
  }

  function handleRefresh() {
    jslid = null;
    loadData(conid, database, sql);
  }

  const quickExportHandlerRef = createQuickExportHandlerRef();

  $: loadData(conid, database, sql);

  function handleJslidDone() {
    loading = false;
    invalidateCommands();
  }

  export function isLoading() {
    return loading;
  }

  export function stopLoading() {
    if (jslid) {
      apiCall('sessions/stop-loading-reader', { jslid });
      loading = false;
      invalidateCommands();
    }
  }

  onDestroy(() => {
    if (jslid && loading) {
      apiCall('sessions/stop-loading-reader', { jslid });
    }
  });

  $: effect = useEffect(() => onJslId(jslid));
  function onJslId(jslidVal) {
    if (jslidVal) {
      apiOn(`session-jslid-done-${jslidVal}`, handleJslidDone);
      return () => {
        apiOff(`session-initialize-file-${jslidVal}`, handleJslidDone);
      };
    } else {
      return () => {};
    }
  }
  $: $effect;

  $: selectedChart = frontMatter?.['selected-chart'];
  $: fixedChartDefinition = selectedChart && frontMatter ? frontMatter?.[`chart-${selectedChart}`] : null;
</script>

<ToolStripContainer>
  {#if loading}
    <LoadingInfo message="Loading data..." />
  {:else if jslid}
    {#if fixedChartDefinition}
      <JslChart {jslid} fixedDefinition={fixedChartDefinition} />
    {:else}
      <JslDataGrid {jslid} listenInitializeFile onCustomGridRefresh={handleRefresh} focusOnVisible />
    {/if}
  {/if}
  <svelte:fragment slot="toolstrip">
    {#if fixedChartDefinition}
      <ToolStripButton on:click={handleRefresh} icon="icon refresh">Refresh</ToolStripButton>
    {:else}
      <ToolStripCommandButton command="dataGrid.refresh" />
    {/if}
    <ToolStripCommandButton command="queryData.stopLoading" />
    {#if !fixedChartDefinition}
      <ToolStripExportButton command="jslTableGrid.export" {quickExportHandlerRef} />
    {/if}
  </svelte:fragment>
</ToolStripContainer>
