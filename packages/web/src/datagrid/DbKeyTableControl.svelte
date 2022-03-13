<script lang="ts">
  import { onMount, tick } from 'svelte';

  import ScrollableTableControl from '../elements/ScrollableTableControl.svelte';
  import { apiCall } from '../utility/api';
  import createRef from '../utility/createRef';

  export let conid;
  export let database;
  export let keyInfo;
  export let onChangeSelected;

  let rows = [];
  let cursor = 0;
  let isLoading = false;
  let loadNextNeeded = false;
  let isLoadedAll = false;
  let selectedIndex;
  const oldIndexRef = createRef(null);

  async function loadNextRows() {
    if (isLoadedAll) {
      return;
    }
    if (isLoading) {
      // console.log('ALREADY LOADING');
      loadNextNeeded = true;
      return;
    }
    isLoading = true;
    try {
      const res = await apiCall('database-connections/load-key-table-range', {
        conid,
        database,
        key: keyInfo.key,
        cursor,
        count: 10,
      });
      const newRows = [...rows];
      for (const row of res.items) {
        if (keyInfo.keyColumn && newRows.find(x => x[keyInfo.keyColumn] == row[keyInfo.keyColumn])) {
          continue;
        }
        newRows.push({ rowNumber: newRows.length + 1, ...row });
      }

      rows = newRows;
      cursor = res.cursor;
      isLoadedAll = cursor == 0;
    } finally {
      isLoading = false;
    }

    if (loadNextNeeded) {
      loadNextNeeded = false;
      await tick();
      loadNextRows();
    }
  }

  $: {
    if (onChangeSelected && rows[selectedIndex]) {
      if (oldIndexRef.get() != selectedIndex) {
        oldIndexRef.set(selectedIndex);
        onChangeSelected(rows[selectedIndex]);
      }
    }
  }

  $: {
    keyInfo;
  }
  onMount(() => {
    loadNextRows();
  });
</script>

<ScrollableTableControl
  columns={[
    {
      fieldName: 'rowNumber',
      header: 'num',
      width: '60px',
    },
    ...keyInfo.keyType.dbKeyFields.map(column => ({
      fieldName: column.name,
      header: column.name,
    })),
  ]}
  {rows}
  onLoadNext={isLoadedAll ? null : loadNextRows}
  selectable
  singleLineRow
  bind:selectedIndex
/>
