<script lang="ts" context="module">
  export const matchingProps = ['conid', 'database', 'schemaName', 'pureName'];
  export const allowAddToFavorites = props => true;
</script>

<script lang="ts">
  import App from '../App.svelte';
  import TableDataGrid from '../datagrid/TableDataGrid.svelte';
  import useGridConfig from '../utility/useGridConfig';
  import {
    createChangeSet,
    createGridCache,
    createGridConfig,
    TableFormViewDisplay,
    TableGridDisplay,
  } from 'dbgate-datalib';
  import { findEngineDriver } from 'dbgate-tools';
  import { writable } from 'svelte/store';
  import createUndoReducer from '../utility/createUndoReducer';
  import invalidateCommands from '../commands/invalidateCommands';

  export let tabid;
  export let conid;
  export let database;
  export let schemaName;
  export let pureName;

  const config = useGridConfig(tabid);
  const cache = writable(createGridCache());

  const [changeSetStore, dispatchChangeSet] = createUndoReducer(createChangeSet());

  $: {
    $changeSetStore;
    invalidateCommands();
  }
</script>

<TableDataGrid
  {...$$props}
  config={$config}
  setConfig={config.update}
  cache={$cache}
  setCache={cache.update}
  changeSetState={$changeSetStore}
  focusOnVisible
  {changeSetStore}
  {dispatchChangeSet}
/>
