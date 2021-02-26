<script lang="ts">
  import { createGridCache, TableFormViewDisplay, TableGridDisplay } from 'dbgate-datalib';
  import { findEngineDriver } from 'dbgate-tools';
  import { writable } from 'svelte/store';
  import { extensions } from '../stores';

  import { useConnectionInfo, useDatabaseInfo } from '../utility/metadataLoaders';

  import DataGrid from './DataGrid.svelte';
  import SqlDataGridCore from './SqlDataGridCore.svelte';

  export let conid;
  export let database;
  export let schemaName;
  export let pureName;
  export let config;

  $: connection = useConnectionInfo({ conid });
  $: dbinfo = useDatabaseInfo({ conid, database });

  const cache = writable(createGridCache());

  // $: console.log('display', display);

  $: display = connection
    ? new TableGridDisplay(
        { schemaName, pureName },
        findEngineDriver($connection, $extensions),
        $config,
        config.update,
        $cache,
        cache.update,
        $dbinfo
      )
    : // ? new TableFormViewDisplay(
      //     { schemaName, pureName },
      //     findEngineDriver(connection, $extensions),
      //     $config,
      //     config.update,
      //     $cache,
      //     cache.update,
      //     $dbinfo
      //   )
      null;
</script>

<DataGrid {...$$props} gridCoreComponent={SqlDataGridCore} {display} />
