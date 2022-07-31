<script lang="ts">
  import CellValue from '../datagrid/CellValue.svelte';

  export let value;
  export let rowSpan;
  export let rowData;
</script>

<td rowspan={rowSpan}>
  {#if value !== undefined}
    <CellValue {rowData} {value} />
  {/if}
</td>

<style>
  td {
    font-weight: normal;
    /* border: 1px solid var(--theme-border); */
    background-color: var(--theme-bg-0);
    padding: 2px;
    position: relative;
    overflow: hidden;
    vertical-align: top;
    border-bottom: 1px solid var(--theme-border);
    border-right: 1px solid var(--theme-border);
  }
</style>
