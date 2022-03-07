<script lang="ts">
  import { onMount } from 'svelte';

  import ScrollableTableControl from '../elements/ScrollableTableControl.svelte';
  import { apiCall } from '../utility/api';

  export let conid;
  export let database;
  export let keyInfo;

  let rows = [];
  let cursor = 0;

  async function loadRows() {
    const res = await apiCall('database-connections/load-key-table-range', {
      conid,
      database,
      key: keyInfo.key,
      cursor,
      count: 10,
    });
    rows = res.items;
  }

  $: {
    keyInfo;
  }
  onMount(() => {
    loadRows();
  });
</script>

<ScrollableTableControl
  columns={[
    keyInfo.tableColumns.map(fieldName => ({
      fieldName,
      header: fieldName,
    })),
  ]}
  {rows}
/>
