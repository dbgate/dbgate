<script lang="ts" context="module">
  export const matchingProps = ['conid', 'database', 'pureName', 'sql'];
</script>

<script lang="ts">
  import ToolStripCommandButton from '../buttons/ToolStripCommandButton.svelte';

  import ToolStripContainer from '../buttons/ToolStripContainer.svelte';
  import ToolStripExportButton, { createQuickExportHandlerRef } from '../buttons/ToolStripExportButton.svelte';

  import JslDataGrid from '../datagrid/JslDataGrid.svelte';
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import { apiCall } from '../utility/api';

  export let sql = undefined;
  export let pureName = undefined;
  export let schemaName = undefined;
  export let conid;
  export let database;

  let jslid;

  async function loadData(conid, database, sql) {
    const resp = await apiCall('sessions/execute-reader', { conid, database, sql, appFolder: schemaName, queryName: pureName });
    jslid = resp.jslid;
  }

  const quickExportHandlerRef = createQuickExportHandlerRef();

  $: loadData(conid, database, sql);
</script>

<ToolStripContainer>
  {#if jslid}
    <JslDataGrid {jslid} listenInitializeFile />
  {:else}
    <LoadingInfo message="Loading data..." />
  {/if}
  <svelte:fragment slot="toolstrip">
    <ToolStripCommandButton command="dataGrid.refresh" />
    <ToolStripExportButton command="jslTableGrid.export" {quickExportHandlerRef} />
  </svelte:fragment>
</ToolStripContainer>
