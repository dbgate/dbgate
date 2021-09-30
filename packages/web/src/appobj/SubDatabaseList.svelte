<script lang="ts">
  import { filterName } from 'dbgate-tools';
  import { useDatabaseList } from '../utility/metadataLoaders';
  import AppObjectList from './AppObjectList.svelte';
  import * as databaseAppObject from './DatabaseAppObject.svelte';

  export let filter;
  export let data;

  $: databases = useDatabaseList({ conid: data._id });
</script>

<AppObjectList
  list={($databases || []).filter(x => filterName(filter, x.name)).map(db => ({ ...db, connection: data }))}
  module={databaseAppObject}
/>
