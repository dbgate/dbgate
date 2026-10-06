<script lang="ts" context="module">
  const OVERLAY_STATUS_ICONS = {
    regular: 'icon equal',
    updated: 'icon not-equal',
    missing: 'img table',
    inserted: 'img archive',
  };
  const OVERLAY_STATUS_TOOLTIPS = {
    regular: 'Row is the same in database and archive',
    updated: 'Row is different in database and archive',
    missing: 'Row is only in database',
    inserted: 'Row is only in archive',
  };
</script>

<script lang="ts">
  import DictionaryLookupModal from '../modals/DictionaryLookupModal.svelte';
  import { showModal } from '../modals/modalTools';

  import DataGridCell from './DataGridCell.svelte';
  import { cellIsSelected } from './gridutil';
  import InplaceEditor from './InplaceEditor.svelte';

  import RowHeaderCell from './RowHeaderCell.svelte';

  export let rowHeight;
  export let rowIndex;
  export let visibleRealColumns: any[];
  export let trailingHorizontalScrollPadding = 0;
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
  export let overlayDefinition = null;

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

  function isCellEditable(col) {
    return grider.isCellEditable ? grider.isCellEditable(rowIndex, col.uniqueName) : grider.editable;
  }

  // $: console.log('rowStatus', rowStatus);
</script>

<tr style={`height: ${rowHeight}px`} class={`coloring-mode-${gridColoringMode} row-color-${rowIndex % 6}`}>
  <RowHeaderCell
    {rowIndex}
    {rowHeight}
    onShowForm={onSetFormView && !overlayDefinition ? () => onSetFormView(rowData, null) : null}
    extraIcon={overlayDefinition ? OVERLAY_STATUS_ICONS[rowStatus.status] : null}
    extraIconTooltip={overlayDefinition ? OVERLAY_STATUS_TOOLTIPS[rowStatus.status] : null}
    isSelected={frameSelection ? false : !!selectedCells?.find(cell => cell[0] == rowIndex && cell[1] == 'header')}
  />
  {#each visibleRealColumns as col (col.uniqueName)}
    {#if inplaceEditorState.cell && rowIndex == inplaceEditorState.cell[0] && col.colIndex == inplaceEditorState.cell[1] && isCellEditable(col)}
      <InplaceEditor
        width={col.width}
        {rowHeight}
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
        {rowHeight}
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
        overlayValue={rowStatus.overlayFields?.[col.uniqueName]}
        hasOverlayValue={rowStatus.overlayFields && col.uniqueName in rowStatus.overlayFields}
        isMissingOverlayField={rowStatus.missingOverlayFields && rowStatus.missingOverlayFields.has(col.uniqueName)}
        isModifiedRow={rowStatus.status == 'updated'}
        isInserted={rowStatus.status == 'inserted' ||
          (rowStatus.insertedFields && rowStatus.insertedFields.has(col.uniqueName))}
        isDeleted={rowStatus.status == 'deleted' ||
          (rowStatus.deletedFields && rowStatus.deletedFields.has(col.uniqueName))}
        isMissing={rowStatus.status == 'missing'}
        {onSetFormView}
        {isDynamicStructure}
        isAutoFillMarker={autofillMarkerCell &&
          autofillMarkerCell[1] == col.colIndex &&
          autofillMarkerCell[0] == rowIndex &&
          isCellEditable(col)}
        onDictionaryLookup={() => handleLookup(col)}
        onSetValue={value => grider.setCellValue(rowIndex, col.uniqueName, value)}
        isReadonly={!isCellEditable(col)}
      />
    {/if}
  {/each}
  {#if trailingHorizontalScrollPadding > 0}
    <td
      class="horizontal-scroll-padding-cell"
      style={`width:${trailingHorizontalScrollPadding}px; min-width:${trailingHorizontalScrollPadding}px; max-width:${trailingHorizontalScrollPadding}px`}
    ></td>
  {/if}
</tr>

<style>
  tr {
    background-color: var(--theme-datagrid-cell-background);
  }

  tr.coloring-mode-36.row-color-2 {
    background-color: var(--theme-datagrid-cell-background-alt);
  }
  tr.coloring-mode-36.row-color-5 {
    background-color: var(--theme-datagrid-cell-background-alt2);
  }

  tr.coloring-mode-2-primary.row-color-0,
  tr.coloring-mode-2-primary.row-color-2,
  tr.coloring-mode-2-primary.row-color-4 {
    background-color: var(--theme-datagrid-cell-background-alt);
  }

  tr.coloring-mode-2-secondary.row-color-0,
  tr.coloring-mode-2-secondary.row-color-2,
  tr.coloring-mode-2-secondary.row-color-4 {
    background-color: var(--theme-datagrid-cell-background-alt2);
  }

  .horizontal-scroll-padding-cell {
    padding: 0;
    margin: 0;
    border: 0;
    background: var(--theme-datagrid-background);
  }
</style>
