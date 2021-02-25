<script lang="ts">
  import DataGridCell from './DataGridCell.svelte';
  import { cellIsSelected } from './gridutil';

  import RowHeaderCell from './RowHeaderCell.svelte';

  export let rowHeight;
  export let rowIndex;
  export let visibleRealColumns: any[];
  export let grider;
  export let frameSelection = undefined;
  export let selectedCells = undefined;
  export let autofillSelectedCells = undefined;

  $: rowData = grider.getRowData(rowIndex);
  $: rowStatus = grider.getRowStatus(rowIndex);

  $: hintFieldsAllowed = visibleRealColumns
    .filter(col => {
      if (!col.hintColumnName) return false;
      if (rowStatus.modifiedFields && rowStatus.modifiedFields.has(col.uniqueName)) return false;
      return true;
    })
    .map(col => col.uniqueName);
</script>

<tr style={`height: ${rowHeight}px`}>
  <RowHeaderCell {rowIndex} />
  {#each visibleRealColumns as col (col.uniqueName)}
    <DataGridCell
      {rowIndex}
      {rowData}
      {col}
      {hintFieldsAllowed}
      isSelected={frameSelection ? false : cellIsSelected(rowIndex, col.colIndex, selectedCells)}
      isFrameSelected={frameSelection ? cellIsSelected(rowIndex, col.colIndex, selectedCells) : false}
      isAutofillSelected={cellIsSelected(rowIndex, col.colIndex, autofillSelectedCells)}
    />
  {/each}
</tr>

<style>
  tr {
    background-color: var(--theme-bg-0);
  }
  tr:nth-child(6n + 3) {
    background-color: var(--theme-bg-1);
  }
  tr:nth-child(6n + 6) {
    background-color: var(--theme-bg-alt);
  }
</style>
