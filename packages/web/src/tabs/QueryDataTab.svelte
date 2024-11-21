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

  export const activator = createActivator('QueryDataTab', true);

  export let sql = undefined;
  export let pureName = undefined;
  export let schemaName = undefined;
  export let conid;
  export let database;

  let jslid;
  let loading = false;

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
</script>

<ToolStripContainer>
  {#if jslid}
    <JslDataGrid {jslid} listenInitializeFile onCustomGridRefresh={handleRefresh} focusOnVisible />
  {:else}
    <LoadingInfo message="Loading data..." />
  {/if}
  <svelte:fragment slot="toolstrip">
    <ToolStripCommandButton command="dataGrid.refresh" />
    <ToolStripCommandButton command="queryData.stopLoading" />
    <ToolStripExportButton command="jslTableGrid.export" {quickExportHandlerRef} />
  </svelte:fragment>
</ToolStripContainer>
