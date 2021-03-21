<script lang="ts" context="module">
  let lastFocusedFormView = null;
  const getCurrentDataForm = () =>
    lastFocusedFormView?.getTabId && lastFocusedFormView?.getTabId() == getActiveTabId() ? lastFocusedFormView : null;
  export function clearLastFocusedFormView() {
    lastFocusedFormView = null;
  }

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

  function isDataCell(cell) {
    return cell[1] % 2 == 1;
  }
</script>

<script lang="ts">
  import _ from 'lodash';

  import { getContext } from 'svelte';
  import { get_current_component } from 'svelte/internal';

  import invalidateCommands from '../commands/invalidateCommands';

  import registerCommand from '../commands/registerCommand';
  import DataGridCell from '../datagrid/DataGridCell.svelte';
  import { clearLastFocusedDataGrid } from '../datagrid/DataGridCore.svelte';
  import InplaceEditor from '../datagrid/InplaceEditor.svelte';
  import { cellFromEvent } from '../datagrid/selection';
  import ColumnLabel from '../elements/ColumnLabel.svelte';
import LoadingInfo from '../elements/LoadingInfo.svelte';
  import { plusExpandIcon } from '../icons/expandIcons';
  import FontIcon from '../icons/FontIcon.svelte';

  import { getActiveTabId } from '../stores';
  import contextMenu from '../utility/contextMenu';
  import createReducer from '../utility/createReducer';
  import keycodes from '../utility/keycodes';
  import resizeObserver from '../utility/resizeObserver';

  export let config;
  export let setConfig;
  export let focusOnVisible = false;
  export let allRowCount;
  export let rowCountBefore;
  export let isLoading;
  export let former;
  export let formDisplay;
  export let onSave;

  let wrapperHeight = 1;
  let rowHeight = 1;
  let currentCell = [0, 0];

  const instance = get_current_component();
  const tabid = getContext('tabid');
  const tabVisible: any = getContext('tabVisible');
  const domCells = {};

  let domFocusField;

  $: if ($tabVisible && domFocusField && focusOnVisible) {
    domFocusField.focus();
  }

  $: rowData = former?.rowData;
  $: rowStatus = former?.rowStatus;

  $: rowCount = Math.floor((wrapperHeight - 20) / rowHeight);

  $: columnChunks = _.chunk(formDisplay.columns, rowCount) as any[][];

  export function getTabId() {
    return tabid;
  }

  export function getFormer() {
    return former;
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
    return [{ command: 'dataForm.switchToTable' }];
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
</script>

{#if isLoading}
  <LoadingInfo wrapper message="Loading data" />
{:else}
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
                style={`height: ${rowHeight}px`}
                class:isSelected={currentCell[0] == rowIndex && currentCell[1] == chunkIndex * 2}
                bind:this={domCells[`${rowIndex},${chunkIndex * 2}`]}
                use:resizeObserver={chunkIndex == 0 && rowIndex == 0}
                on:resize={e => {
                  // @ts-ignore
                  if (rowHeight == 1) rowHeight = e.detail.height;
                }}
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
                  <ColumnLabel {...col} headerText={col.columnName} />
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
                hideContent={$inplaceEditorState.cell &&
                  rowIndex == $inplaceEditorState.cell[0] &&
                  chunkIndex * 2 + 1 == $inplaceEditorState.cell[1]}
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
          lastFocusedFormView = instance;
          clearLastFocusedDataGrid();
          invalidateCommands();
        }}
        on:keydown={handleKeyDown}
      />
    </div>
  </div>
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
</style>
