<script lang="ts" context="module">
  export const matchingProps = ['conid', 'database', 'schemaName', 'pureName'];
  export const allowAddToFavorites = props => true;
</script>

<script lang="ts">
  import App from '../App.svelte';
  import DataGrid from '../datagrid/DataGrid.svelte';
  import useGridConfig from '../utility/useGridConfig';
  import {
    createChangeSet,
    createGridCache,
    createGridConfig,
    TableFormViewDisplay,
    CollectionGridDisplay,
  } from 'dbgate-datalib';
  import { findEngineDriver } from 'dbgate-tools';
  import { writable } from 'svelte/store';
  import createUndoReducer from '../utility/createUndoReducer';
  import invalidateCommands from '../commands/invalidateCommands';
  import CollectionDataGridCore from '../datagrid/CollectionDataGridCore.svelte';
  import { useCollectionInfo, useConnectionInfo } from '../utility/metadataLoaders';
  import { extensions } from '../stores';

  export let tabid;
  export let conid;
  export let database;
  export let schemaName;
  export let pureName;

  let loadedRows;

  const config = useGridConfig(tabid);
  const cache = writable(createGridCache());

  const [changeSetStore, dispatchChangeSet] = createUndoReducer(createChangeSet());

  $: {
    $changeSetStore;
    invalidateCommands();
  }

  $: connection = useConnectionInfo({ conid });
  $: collectionInfo = useCollectionInfo({ conid, database, schemaName, pureName });

  $: display =
    $collectionInfo && $connection
      ? new CollectionGridDisplay(
          $collectionInfo,
          findEngineDriver($connection, $extensions),
          //@ts-ignore
          $config,
          config.update,
          $cache,
          cache.update,
          loadedRows
        )
      : null;
  // $: console.log('LOADED ROWS MONGO', loadedRows);
</script>

<DataGrid
  bind:loadedRows
  {...$$props}
  config={$config}
  setConfig={config.update}
  cache={$cache}
  setCache={cache.update}
  changeSetState={$changeSetStore}
  focusOnVisible
  {display}
  {changeSetStore}
  {dispatchChangeSet}
  gridCoreComponent={CollectionDataGridCore}
  isDynamicStructure
/>
