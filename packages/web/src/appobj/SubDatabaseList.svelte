<script lang="ts">
  import { useDatabaseList } from '../utility/metadataLoaders';
  import AppObjectList from './AppObjectList.svelte';
  import * as databaseAppObject from './DatabaseAppObject.svelte';

  export let data;

  $: databases = useDatabaseList({ conid: data._id });
</script>

<AppObjectList list={($databases || []).map(db => ({ ...db, connection: data }))} module={databaseAppObject} />
