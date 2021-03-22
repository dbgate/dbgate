<script lang="ts" context="module">
  export const matchingProps = ['archiveFile', 'archiveFolder'];
</script>

<script lang="ts">
  import JslDataGrid from '../datagrid/JslDataGrid.svelte';

  export let archiveFolder;
  export let archiveFile;
</script>

<JslDataGrid jslid={`archive://${archiveFolder}/${archiveFile}`} />
