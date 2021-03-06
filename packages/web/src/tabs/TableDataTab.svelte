<script lang="ts">
  import App from '../App.svelte';
  import TableDataGrid from '../datagrid/TableDataGrid.svelte';
  import useGridConfig from '../utility/useGridConfig';
  import { createGridCache, createGridConfig, TableFormViewDisplay, TableGridDisplay } from 'dbgate-datalib';
  import { findEngineDriver } from 'dbgate-tools';
  import { writable } from 'svelte/store';

  export let tabid;
  export let conid;
  export let database;
  export let schemaName;
  export let pureName;

  const config = useGridConfig(tabid);
  const cache = writable(createGridCache());
</script>

<TableDataGrid {...$$props} config={$config} setConfig={config.update} cache={$cache} setCache={cache.update} />
