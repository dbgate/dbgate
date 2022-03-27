<script lang="ts" context="module">
  export const matchingProps = ['archiveFile', 'archiveFolder', 'jslid'];
</script>

<script lang="ts">
  import ToolStripCommandButton from '../buttons/ToolStripCommandButton.svelte';

  import ToolStripContainer from '../buttons/ToolStripContainer.svelte';
  import ToolStripExportButton, { createQuickExportHandlerRef } from '../buttons/ToolStripExportButton.svelte';

  import JslDataGrid from '../datagrid/JslDataGrid.svelte';

  export let archiveFolder = undefined;
  export let archiveFile = undefined;
  export let jslid = undefined;

  const quickExportHandlerRef = createQuickExportHandlerRef();
</script>

<ToolStripContainer>
  <JslDataGrid jslid={jslid || `archive://${archiveFolder}/${archiveFile}`} supportsReload />
  <svelte:fragment slot="toolstrip">
    <ToolStripCommandButton command="dataGrid.refresh" />
    <ToolStripExportButton command="jslTableGrid.export" {quickExportHandlerRef} />
  </svelte:fragment>
</ToolStripContainer>
