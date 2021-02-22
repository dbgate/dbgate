<script lang="ts">
import { TableFormViewDisplay } from 'dbgate-datalib';
import { findEngineDriver } from 'dbgate-tools';

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

  // $: display = connection
  //     ? new TableFormViewDisplay(
  //         { schemaName, pureName },
  //         findEngineDriver(connection, extensions),
  //         config,
  //         setConfig,
  //         cache || myCache,
  //         setCache || setMyCache,
  //         dbinfo
  //       )
  //     : null;;

</script>

 <!-- <DataGrid {...$$props} gridCoreComponent={SqlDataGridCore} /> -->

 XXX
