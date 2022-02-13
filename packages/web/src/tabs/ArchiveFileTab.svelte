<script lang="ts" context="module">
  export const matchingProps = ['archiveFile', 'archiveFolder'];
</script>

<script lang="ts">
  import JslDataGrid from '../datagrid/JslDataGrid.svelte';

  export let archiveFolder = undefined;
  export let archiveFile = undefined;
  export let jslid = undefined;
</script>

<JslDataGrid jslid={jslid || `archive://${archiveFolder}/${archiveFile}`} />
