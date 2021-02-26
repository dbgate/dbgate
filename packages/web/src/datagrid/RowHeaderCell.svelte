<script lang="ts">
  export let rowIndex;
</script>

<td data-row={rowIndex} data-col="header">
  {rowIndex + 1}
</td>

<style>
  td {
    border: 1px solid var(--theme-border);
    text-align: left;
    padding: 2px;
    background-color: var(--theme-bg-1);
    overflow: hidden;
    position: relative;
  }
</style>
