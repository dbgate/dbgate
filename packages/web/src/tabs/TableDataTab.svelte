<script lang="ts">
  import App from '../App.svelte';
  import TableDataGrid from '../datagrid/TableDataGrid.svelte';
  import useGridConfig from '../utility/useGridConfig';

  export let tabid;
  export let conid;
  export let database;
  export let schemaName;
  export let pureName;

  const config = useGridConfig(tabid);
</script>

<TableDataGrid {...$$props} {config} />
