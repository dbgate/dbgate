<script lang="ts">
  import openReferenceForm from '../formview/openReferenceForm';
  import DictionaryLookupModal from '../modals/DictionaryLookupModal.svelte';
  import { showModal } from '../modals/modalTools';

  import DataGridCell from './DataGridCell.svelte';
  import { cellIsSelected } from './gridutil';
  import InplaceEditor from './InplaceEditor.svelte';

  import RowHeaderCell from './RowHeaderCell.svelte';

  export let rowHeight;
  export let rowIndex;
  export let visibleRealColumns: any[];
  export let grider;
  export let frameSelection = undefined;
  export let selectedCells = undefined;
  export let autofillSelectedCells = undefined;
  export let autofillMarkerCell = undefined;
  export let focusedColumns = undefined;
  export let inplaceEditorState;
  export let dispatchInsplaceEditor;
  export let onSetFormView;
  export let isDynamicStructure = false;
  export let currentCellColumn;
  export let conid;
  export let database;
  export let driver;
  export let gridColoringMode = '36';

  export let dataEditorTypesBehaviourOverride = null;

  $: rowData = grider.getRowData(rowIndex);
  $: rowStatus = grider.getRowStatus(rowIndex);

  $: hintFieldsAllowed = visibleRealColumns
    .filter(col => {
      if (!col.hintColumnNames) return false;
      if (rowStatus.modifiedFields && rowStatus.modifiedFields.has(col.uniqueName)) return false;
      return true;
    })
    .map(col => col.uniqueName);

  function handleLookup(col) {
    showModal(DictionaryLookupModal, {
      conid,
      database,
      driver,
      pureName: col.foreignKey.refTableName,
      schemaName: col.foreignKey.refSchemaName,
      onConfirm: value => grider.setCellValue(rowIndex, col.uniqueName, value),
    });
  }
</script>

<tr style={`height: ${rowHeight}px`} class={`coloring-mode-${gridColoringMode}`}>
  <RowHeaderCell {rowIndex} onShowForm={onSetFormView ? () => onSetFormView(rowData, null) : null} />
  {#each visibleRealColumns as col (col.uniqueName)}
    {#if inplaceEditorState.cell && rowIndex == inplaceEditorState.cell[0] && col.colIndex == inplaceEditorState.cell[1]}
      <InplaceEditor
        width={col.width}
        {inplaceEditorState}
        {dispatchInsplaceEditor}
        cellValue={rowData[col.uniqueName]}
        options={col.options}
        canSelectMultipleOptions={col.canSelectMultipleOptions}
        onSetValue={value => grider.setCellValue(rowIndex, col.uniqueName, value)}
        {driver}
        {dataEditorTypesBehaviourOverride}
      />
    {:else}
      <DataGridCell
        {rowIndex}
        {rowData}
        {col}
        {conid}
        {database}
        editorTypes={dataEditorTypesBehaviourOverride ?? driver?.dataEditorTypesBehaviour}
        allowHintField={hintFieldsAllowed?.includes(col.uniqueName)}
        isSelected={frameSelection ? false : cellIsSelected(rowIndex, col.colIndex, selectedCells)}
        isCurrentCell={col.colIndex == currentCellColumn}
        isFrameSelected={frameSelection ? cellIsSelected(rowIndex, col.colIndex, selectedCells) : false}
        isAutofillSelected={cellIsSelected(rowIndex, col.colIndex, autofillSelectedCells)}
        isFocusedColumn={focusedColumns?.includes(col.uniqueName)}
        isModifiedCell={rowStatus.modifiedFields && rowStatus.modifiedFields.has(col.uniqueName)}
        isModifiedRow={rowStatus.status == 'updated'}
        isInserted={rowStatus.status == 'inserted' ||
          (rowStatus.insertedFields && rowStatus.insertedFields.has(col.uniqueName))}
        isDeleted={rowStatus.status == 'deleted' ||
          (rowStatus.deletedFields && rowStatus.deletedFields.has(col.uniqueName))}
        {onSetFormView}
        {isDynamicStructure}
        isAutoFillMarker={autofillMarkerCell &&
          autofillMarkerCell[1] == col.colIndex &&
          autofillMarkerCell[0] == rowIndex &&
          grider.editable}
        onDictionaryLookup={() => handleLookup(col)}
        onSetValue={value => grider.setCellValue(rowIndex, col.uniqueName, value)}
        isReadonly={!grider.editable}
      />
    {/if}
  {/each}
</tr>

<style>
  tr {
    background-color: var(--theme-bg-0);
  }

  tr.coloring-mode-36:nth-child(6n + 3) {
    background-color: var(--theme-bg-1);
  }
  tr.coloring-mode-36:nth-child(6n + 6) {
    background-color: var(--theme-bg-alt);
  }

  tr.coloring-mode-2-primary:nth-child(2n + 1) {
    background-color: var(--theme-bg-1);
  }

  tr.coloring-mode-2-secondary:nth-child(2n + 1) {
    background-color: var(--theme-bg-alt);
  }
</style>
