<script lang="ts" context="module">
  export const matchingProps = ['conid', 'database', 'schemaName', 'pureName'];
  export const allowAddToFavorites = props => true;
</script>

<script lang="ts">
  import { createGridCache, ViewGridDisplay } from 'dbgate-datalib';
  import { findEngineDriver } from 'dbgate-tools';
  import { setContext } from 'svelte';
  import { writable } from 'svelte/store';

  import DataGrid from '../datagrid/DataGrid.svelte';
  import SqlDataGridCore from '../datagrid/SqlDataGridCore.svelte';
  import { getBoolSettingsValue } from '../settings/settingsTools';
  import { extensions } from '../stores';
  import { useConnectionInfo, useDatabaseServerVersion, useViewInfo } from '../utility/metadataLoaders';
  import { getLocalStorage, setLocalStorage } from '../utility/storageCache';
  import useGridConfig from '../utility/useGridConfig';
  import StatusBarTabItem from '../widgets/StatusBarTabItem.svelte';

  export let tabid;
  export let conid;
  export let database;
  export let schemaName;
  export let pureName;

  $: connection = useConnectionInfo({ conid });
  $: viewInfo = useViewInfo({ conid, database, schemaName, pureName });
  $: serverVersion = useDatabaseServerVersion({ conid, database });

  const config = useGridConfig(tabid);
  const cache = writable(createGridCache());

  $: display =
    $viewInfo && $connection && $serverVersion
      ? new ViewGridDisplay(
          $viewInfo,
          findEngineDriver($connection, $extensions),
          //@ts-ignore
          $config,
          config.update,
          $cache,
          cache.update,
          $serverVersion
        )
      : null;

  const collapsedLeftColumnStore = writable(getLocalStorage('dataGrid_collapsedLeftColumn', false));
  setContext('collapsedLeftColumnStore', collapsedLeftColumnStore);
  $: setLocalStorage('dataGrid_collapsedLeftColumn', $collapsedLeftColumnStore);
</script>

{#if display}
  <DataGrid
    {...$$props}
    {display}
    config={$config}
    setConfig={config.update}
    cache={$cache}
    setCache={cache.update}
    focusOnVisible
    gridCoreComponent={SqlDataGridCore}
  />
{/if}

<StatusBarTabItem
  text="View columns"
  icon={$collapsedLeftColumnStore ? 'icon columns-outline' : 'icon columns'}
  clickable
  onClick={() => collapsedLeftColumnStore.update(x => !x)}
/>
