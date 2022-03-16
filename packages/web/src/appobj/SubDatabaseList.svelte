<script lang="ts">
  import { filterName } from 'dbgate-tools';
  import _ from 'lodash';
  import { useDatabaseList } from '../utility/metadataLoaders';
  import AppObjectList from './AppObjectList.svelte';
  import * as databaseAppObject from './DatabaseAppObject.svelte';

  export let filter;
  export let data;
  export let passProps;

  $: databases = useDatabaseList({ conid: data._id });
</script>

<AppObjectList
  list={_.sortBy(
    ($databases || []).filter(x => filterName(filter, x.name)),
    x => x.sortOrder ?? x.name
  ).map(db => ({ ...db, connection: data }))}
  module={databaseAppObject}
  {passProps}
/>
