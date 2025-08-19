<script lang="ts">
  import { writable } from 'svelte/store';
  import TableControl from '../elements/TableControl.svelte';
  import formatFileSize from '../utility/formatFileSize';

  export let rows: any[] = [];
  export let columns: any[] = [];

  const filters = writable({});

  const tableColumns = columns.map(col => ({
    filterable: col.filterable,
    sortable: col.sortable,
    header: col.header,
    fieldName: col.fieldName,
    type: col.type || 'data',
    formatter: (row, col) => {
      const value = row[col.fieldName];

      if (col.type === 'fileSize') return formatFileSize(value);
      return value;
    },
  }));
</script>

<div>
  <TableControl {filters} stickyHeader {rows} columns={tableColumns} />
</div>

<style>
  div {
    padding: 10px;
  }
</style>
