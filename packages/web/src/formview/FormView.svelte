<script lang="ts" context="module">
  const getCurrentDataForm = () => getActiveComponent('FormView');

  registerCommand({
    id: 'dataForm.switchToTable',
    category: 'Data form',
    name: 'Switch to table',
    keyText: 'F4',
    testEnabled: () => getCurrentDataForm() != null,
    onClick: () => getCurrentDataForm().switchToTable(),
  });

  registerCommand({
    id: 'dataForm.save',
    group: 'save',
    category: 'Data form',
    name: 'Save',
    toolbar: true,
    icon: 'icon save',
    testEnabled: () => getCurrentDataForm()?.getFormer()?.allowSave,
    onClick: () => getCurrentDataForm().save(),
  });

  registerCommand({
    id: 'dataForm.copyToClipboard',
    category: 'Data grid',
    name: 'Copy to clipboard',
    keyText: 'Ctrl+C',
    disableHandleKeyText: 'Ctrl+C',
    testEnabled: () => getCurrentDataForm() != null,
    onClick: () => getCurrentDataForm().copyToClipboard(),
  });

  registerCommand({
    id: 'dataForm.revertRowChanges',
    category: 'Data form',
    name: 'Revert row changes',
    keyText: 'Ctrl+R',
    testEnabled: () => getCurrentDataForm()?.getFormer()?.containsChanges,
    onClick: () => getCurrentDataForm().getFormer().revertRowChanges(),
  });

  registerCommand({
    id: 'dataForm.setNull',
    category: 'Data form',
    name: 'Set NULL',
    keyText: 'Ctrl+0',
    testEnabled: () => getCurrentDataForm() != null,
    onClick: () => getCurrentDataForm().setNull(),
  });

  registerCommand({
    id: 'dataForm.undo',
    category: 'Data form',
    name: 'Undo',
    group: 'undo',
    icon: 'icon undo',
    toolbar: true,
    testEnabled: () => getCurrentDataForm()?.getFormer()?.canUndo,
    onClick: () => getCurrentDataForm().getFormer().undo(),
  });

  registerCommand({
    id: 'dataForm.redo',
    category: 'Data form',
    name: 'Redo',
    group: 'redo',
    icon: 'icon redo',
    toolbar: true,
    testEnabled: () => getCurrentDataForm()?.getFormer()?.canRedo,
    onClick: () => getCurrentDataForm().getFormer().redo(),
  });

  registerCommand({
    id: 'dataGdataFormrid.reconnect',
    category: 'Data grid',
    name: 'Reconnect',
    testEnabled: () => getCurrentDataForm() != null,
    onClick: () => getCurrentDataForm().reconnect(),
  });

  registerCommand({
    id: 'dataForm.filterSelected',
    category: 'Data form',
    name: 'Filter this value',
    keyText: 'Ctrl+F',
    testEnabled: () => getCurrentDataForm() != null,
    onClick: () => getCurrentDataForm().filterSelectedValue(),
  });

  registerCommand({
    id: 'dataForm.addToFilter',
    category: 'Data form',
    name: 'Add to filter',
    testEnabled: () => getCurrentDataForm() != null,
    onClick: () => getCurrentDataForm().addToFilter(),
  });

  registerCommand({
    id: 'dataForm.goToFirst',
    category: 'Data form',
    name: 'First',
    keyText: 'Ctrl+Home',
    toolbar: true,
    icon: 'icon arrow-begin',
    testEnabled: () => getCurrentDataForm() != null,
    onClick: () => getCurrentDataForm().navigate('begin'),
  });

  registerCommand({
    id: 'dataForm.goToPrevious',
    category: 'Data form',
    name: 'Previous',
    keyText: 'Ctrl+ArrowUp',
    toolbar: true,
    icon: 'icon arrow-left',
    testEnabled: () => getCurrentDataForm() != null,
    onClick: () => getCurrentDataForm().navigate('previous'),
  });

  registerCommand({
    id: 'dataForm.goToNext',
    category: 'Data form',
    name: 'Next',
    keyText: 'Ctrl+ArrowDown',
    toolbar: true,
    icon: 'icon arrow-right',
    testEnabled: () => getCurrentDataForm() != null,
    onClick: () => getCurrentDataForm().navigate('next'),
  });

  registerCommand({
    id: 'dataForm.goToLast',
    category: 'Data form',
    name: 'Last',
    keyText: 'Ctrl+End',
    toolbar: true,
    icon: 'icon arrow-end',
    testEnabled: () => getCurrentDataForm() != null,
    onClick: () => getCurrentDataForm().navigate('end'),
  });

  function isDataCell(cell) {
    return cell[1] % 2 == 1;
  }
</script>

<script lang="ts">
  import _ from 'lodash';

  import { getContext } from 'svelte';

  import invalidateCommands from '../commands/invalidateCommands';

  import registerCommand from '../commands/registerCommand';
  import DataGridCell from '../datagrid/DataGridCell.svelte';
  import { dataGridRowHeight } from '../datagrid/DataGridRowHeightMeter.svelte';
  import InplaceEditor from '../datagrid/InplaceEditor.svelte';
  import { cellFromEvent } from '../datagrid/selection';
  import ColumnLabel from '../elements/ColumnLabel.svelte';
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import { plusExpandIcon } from '../icons/expandIcons';
  import FontIcon from '../icons/FontIcon.svelte';

  import axiosInstance from '../utility/axiosInstance';
  import { copyTextToClipboard } from '../utility/clipboard';
  import contextMenu from '../utility/contextMenu';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import createReducer from '../utility/createReducer';
  import keycodes from '../utility/keycodes';
  import resizeObserver from '../utility/resizeObserver';
  import openReferenceForm from './openReferenceForm';

  export let conid;
  export let database;
  export let config;
  export let setConfig;
  export let focusOnVisible = false;
  export let allRowCount;
  export let rowCountBefore;
  export let isLoading;
  export let former;
  export let formDisplay;
  export let onSave;
  export let onNavigate;

  let wrapperHeight = 1;
  $: rowHeight = $dataGridRowHeight;
  let currentCell = [0, 0];

  const tabVisible: any = getContext('tabVisible');
  const domCells = {};

  let domFocusField;

  $: if ($tabVisible && domFocusField && focusOnVisible) {
    domFocusField.focus();
  }

  $: rowData = former?.rowData;
  $: rowStatus = former?.rowStatus;

  $: rowCount = Math.floor((wrapperHeight - 22) / (rowHeight + 2));

  $: columnChunks = _.chunk(formDisplay.columns, rowCount) as any[][];

  $: rowCountInfo = getRowCountInfo(rowCountBefore, allRowCount);

  function getRowCountInfo(rowCountBefore, allRowCount) {
    if (rowData == null) return 'No data';
    if (allRowCount == null || rowCountBefore == null) return 'Loading row count...';
    return `Row: ${(rowCountBefore + 1).toLocaleString()} / ${allRowCount.toLocaleString()}`;
  }

  export function getFormer() {
    return former;
  }

  export function navigate(command) {
    if (onNavigate) onNavigate(command);
  }

  export function switchToTable() {
    setConfig(cfg => ({
      ...cfg,
      isFormView: false,
      formViewKey: null,
    }));
  }

  export function save() {
    if ($inplaceEditorState.cell) {
      // @ts-ignore
      dispatchInsplaceEditor({ type: 'shouldSave' });
      return;
    }
    if (onSave) onSave();
  }

  export function setNull() {
    if (isDataCell(currentCell)) {
      setCellValue(currentCell, null);
    }
  }

  export function copyToClipboard() {
    const column = getCellColumn(currentCell);
    if (!column) return;
    const text = currentCell[1] % 2 == 1 ? rowData[column.uniqueName] : column.columnName;
    copyTextToClipboard(text);
  }

  export async function reconnect() {
    await axiosInstance.post('database-connections/refresh', { conid, database });
    formDisplay.reload();
  }

  export function filterSelectedValue() {
    formDisplay.filterCellValue(getCellColumn(currentCell), rowData);
  }

  export function addToFilter() {
    formDisplay.addFilterColumn(getCellColumn(currentCell));
  }

  export const activator = createActivator('FormView', false);

  const handleTableMouseDown = event => {
    if (event.target.closest('.buttonLike')) return;
    if (event.target.closest('.resizeHandleControl')) return;
    if (event.target.closest('input')) return;

    event.preventDefault();
    if (domFocusField) domFocusField.focus();

    // event.target.closest('table').focus();
    event.preventDefault();
    const cell = cellFromEvent(event);

    if (isDataCell(cell) && !_.isEqual(cell, $inplaceEditorState.cell) && _.isEqual(cell, currentCell)) {
      // @ts-ignore
      if (rowData) {
        dispatchInsplaceEditor({ type: 'show', cell, selectAll: true });
      }
    } else if (!_.isEqual(cell, $inplaceEditorState.cell)) {
      // @ts-ignore
      dispatchInsplaceEditor({ type: 'close' });
    }

    // @ts-ignore
    currentCell = cell;
  };

  function getCellColumn(cell) {
    const chunk = columnChunks[Math.floor(cell[1] / 2)];
    if (!chunk) return;
    const column = chunk[cell[0]];
    return column;
  }

  function setCellValue(cell, value) {
    const column = getCellColumn(cell);
    if (!column) return;
    former.setCellValue(column.uniqueName, value);
  }

  const getCellWidth = (row, col) => {
    const element = domCells[`${row},${col}`];
    if (element) return element.getBoundingClientRect().width;
    return 100;
  };

  const [inplaceEditorState, dispatchInsplaceEditor] = createReducer((state, action) => {
    switch (action.type) {
      case 'show': {
        const column = getCellColumn(action.cell);
        if (!column) return state;
        if (column.uniquePath.length > 1) return state;

        // if (!grider.editable) return {};
        return {
          cell: action.cell,
          text: action.text,
          selectAll: action.selectAll,
        };
      }
      case 'close': {
        const [row, col] = currentCell || [];
        if (domFocusField) domFocusField.focus();
        // @ts-ignore
        if (action.mode == 'enter' && row) setTimeout(() => moveCurrentCell(row + 1, col), 0);
        // if (action.mode == 'save') setTimeout(handleSave, 0);
        return {};
      }
      case 'shouldSave': {
        return {
          ...state,
          shouldSave: true,
        };
      }
    }
    return {};
  }, {});
  function createMenu() {
    return [
      { command: 'dataForm.switchToTable' },
      { command: 'dataForm.copyToClipboard' },
      { divider: true },
      { command: 'dataForm.filterSelected' },
      { command: 'dataForm.addToFilter' },
      { divider: true },
      { command: 'dataForm.save' },
      { command: 'dataForm.revertRowChanges' },
      { command: 'dataForm.setNull' },
      { divider: true },
      { command: 'dataForm.undo' },
      { command: 'dataForm.redo' },
      { divider: true },
      { command: 'dataForm.goToFirst' },
      { command: 'dataForm.goToPrevious' },
      { command: 'dataForm.goToNext' },
      { command: 'dataForm.goToLast' },
    ];
  }

  function handleKeyDown(event) {
    if ($inplaceEditorState.cell) return;

    if (
      !event.ctrlKey &&
      !event.altKey &&
      ((event.keyCode >= keycodes.a && event.keyCode <= keycodes.z) ||
        (event.keyCode >= keycodes.n0 && event.keyCode <= keycodes.n9) ||
        event.keyCode == keycodes.dash)
    ) {
      // @ts-ignore
      event.preventDefault();
      dispatchInsplaceEditor({ type: 'show', text: event.key, cell: currentCell });
      // console.log('event', event.nativeEvent);
    }

    if (event.keyCode == keycodes.f2) {
      // @ts-ignore
      dispatchInsplaceEditor({ type: 'show', cell: currentCell, selectAll: true });
    }

    handleCursorMove(event);
  }

  const scrollIntoView = cell => {
    const element = domCells[`${cell[0]},${cell[1]}`];
    if (element) element.scrollIntoView();
  };

  const moveCurrentCell = (row, col) => {
    if (row < 0) row = 0;
    if (col < 0) col = 0;
    if (col >= columnChunks.length * 2) col = columnChunks.length * 2 - 1;
    const chunk = columnChunks[Math.floor(col / 2)];
    if (chunk && row >= chunk.length) row = chunk.length - 1;
    currentCell = [row, col];
    scrollIntoView(currentCell);
  };

  const handleCursorMove = event => {
    if (event.ctrlKey) {
      switch (event.keyCode) {
        case keycodes.leftArrow:
          return moveCurrentCell(currentCell[0], 0);
        case keycodes.rightArrow:
          return moveCurrentCell(currentCell[0], columnChunks.length * 2 - 1);
      }
    }
    switch (event.keyCode) {
      case keycodes.leftArrow:
        return moveCurrentCell(currentCell[0], currentCell[1] - 1);
      case keycodes.rightArrow:
        return moveCurrentCell(currentCell[0], currentCell[1] + 1);
      case keycodes.upArrow:
        return moveCurrentCell(currentCell[0] - 1, currentCell[1]);
      case keycodes.downArrow:
        return moveCurrentCell(currentCell[0] + 1, currentCell[1]);
      case keycodes.pageUp:
        return moveCurrentCell(0, currentCell[1]);
      case keycodes.pageDown:
        return moveCurrentCell(rowCount - 1, currentCell[1]);
      case keycodes.home:
        return moveCurrentCell(0, 0);
      case keycodes.end:
        return moveCurrentCell(rowCount - 1, columnChunks.length * 2 - 1);
    }
  };

  function handleSetFormView(rowData, column) {
    openReferenceForm(rowData, column, conid, database);
  }
</script>

<div class="outer">
  <div class="wrapper" use:contextMenu={createMenu} bind:clientHeight={wrapperHeight}>
    {#each columnChunks as chunk, chunkIndex}
      <table on:mousedown={handleTableMouseDown}>
        {#each chunk as col, rowIndex}
          <tr>
            <td
              class="header-cell"
              data-row={rowIndex}
              data-col={chunkIndex * 2}
              style={rowHeight > 1 ? `height: ${rowHeight}px` : undefined}
              class:isSelected={currentCell[0] == rowIndex && currentCell[1] == chunkIndex * 2}
              bind:this={domCells[`${rowIndex},${chunkIndex * 2}`]}
            >
              <div class="header-cell-inner">
                {#if col.foreignKey}
                  <FontIcon
                    icon={plusExpandIcon(formDisplay.isExpandedColumn(col.uniqueName))}
                    on:click={e => {
                      e.stopPropagation();
                      formDisplay.toggleExpandedColumn(col.uniqueName);
                    }}
                  />
                {:else}
                  <FontIcon icon="icon invisible-box" />
                {/if}
                <span style={`margin-left: ${(col.uniquePath.length - 1) * 20}px`} />
                <ColumnLabel
                  {...col}
                  headerText={col.columnName}
                  extInfo={col.foreignKey ? ` -> ${col.foreignKey.refTableName}` : null}
                />
              </div>
            </td>
            <DataGridCell
              {rowIndex}
              {col}
              {rowData}
              colIndex={chunkIndex * 2 + 1}
              isSelected={currentCell[0] == rowIndex && currentCell[1] == chunkIndex * 2 + 1}
              isModifiedCell={rowStatus.modifiedFields && rowStatus.modifiedFields.has(col.uniqueName)}
              bind:domCell={domCells[`${rowIndex},${chunkIndex * 2 + 1}`]}
              onSetFormView={handleSetFormView}
              hideContent={!rowData ||
                ($inplaceEditorState.cell &&
                  rowIndex == $inplaceEditorState.cell[0] &&
                  chunkIndex * 2 + 1 == $inplaceEditorState.cell[1])}
            >
              {#if $inplaceEditorState.cell && rowIndex == $inplaceEditorState.cell[0] && chunkIndex * 2 + 1 == $inplaceEditorState.cell[1]}
                <InplaceEditor
                  width={getCellWidth(rowIndex, chunkIndex * 2 + 1)}
                  inplaceEditorState={$inplaceEditorState}
                  {dispatchInsplaceEditor}
                  cellValue={rowData[col.uniqueName]}
                  onSetValue={value => {
                    former.setCellValue(col.uniqueName, value);
                  }}
                />
              {/if}
            </DataGridCell>
          </tr>
        {/each}
      </table>
    {/each}
    <input
      type="text"
      class="focus-field"
      bind:this={domFocusField}
      on:focus={() => {
        activator.activate();
        invalidateCommands();
      }}
      on:keydown={handleKeyDown}
      on:copy={copyToClipboard}
    />
  </div>
  {#if rowCountInfo}
    <div class="row-count-label">
      {rowCountInfo}
    </div>
  {/if}
</div>

{#if isLoading}
  <LoadingInfo wrapper message="Loading data" />
{/if}

<style>
  table {
    border-collapse: collapse;
    outline: none;
  }

  .outer {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    right: 0;
  }

  .wrapper {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    right: 0;
    display: flex;
    overflow-x: scroll;
    align-items: flex-start;
  }

  tr {
    background-color: var(--theme-bg-0);
  }
  tr:nth-child(6n + 3) {
    background-color: var(--theme-bg-1);
  }
  tr:nth-child(6n + 6) {
    background-color: var(--theme-bg-alt);
  }

  .header-cell {
    border: 1px solid var(--theme-border);
    text-align: left;
    padding: 0;
    margin: 0;
    background-color: var(--theme-bg-1);
    overflow: hidden;
  }
  .header-cell.isSelected {
    background: var(--theme-bg-selected);
  }

  .header-cell-inner {
    display: flex;
  }

  .focus-field {
    position: absolute;
    left: -1000px;
    top: -1000px;
  }

  .row-count-label {
    position: absolute;
    background-color: var(--theme-bg-2);
    right: 40px;
    bottom: 20px;
  }
</style>
