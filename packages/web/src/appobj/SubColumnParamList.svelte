<script lang="ts">
  import { findForeignKeyForColumn } from 'dbgate-tools';

  import AppObjectList from './AppObjectList.svelte';
  import * as columnAppObject from './ColumnAppObject.svelte';

  export let data;
</script>

<AppObjectList
  list={(data.columns || []).map(col => ({
    ...data,
    ...col,
    foreignKey: findForeignKeyForColumn(data, col),
  }))}
  module={columnAppObject}
/>
