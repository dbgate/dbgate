<script lang="ts">
  import TableControl from '../elements/TableControl.svelte';

  export let rows: any[] = [];
  export let columns: any[] = [];

  const tableColumns = columns.map(col => ({
    header: col.header,
    fieldName: col.fieldName,
  }));
</script>

<div>
  <TableControl {rows} columns={tableColumns} />
</div>

<style>
  div {
    padding: 10px;
  }
</style>
