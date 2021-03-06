<script lang="ts" context="module">
  const currentDataGrid = writable(null);

  const currentDataGridChangeSet = memberStore(currentDataGrid, grid => grid?.getChangeSetStore() || nullStore);

  registerCommand({
    id: 'dataGrid.refresh',
    category: 'Data grid',
    name: 'Refresh',
    keyText: 'F5',
    toolbar: true,
    icon: 'icon reload',
    enabledStore: derived(currentDataGrid, grid => grid != null),
    onClick: () => get(currentDataGrid).refresh(),
  });

  registerCommand({
    id: 'dataGrid.save',
    category: 'Data grid',
    name: 'Save',
    keyText: 'Ctrl+S',
    toolbar: true,
    icon: 'icon save',
    enabledStore: derived(currentDataGridChangeSet, (changeSet: any) => changeSetContainsChanges(changeSet?.value)),
    onClick: () => get(currentDataGrid).save(),
  });

  registerCommand({
    id: 'dataGrid.revertRowChanges',
    category: 'Data grid',
    name: 'Revert row changes',
    keyText: 'Ctrl+R',
    enabledStore: derived(currentDataGridChangeSet, (changeSet: any) => changeSetContainsChanges(changeSet?.value)),
    onClick: () => get(currentDataGrid).revertRowChanges(),
  });

  registerCommand({
    id: 'dataGrid.revertAllChanges',
    category: 'Data grid',
    name: 'Revert all changes',
    enabledStore: derived(currentDataGridChangeSet, (changeSet: any) => changeSetContainsChanges(changeSet?.value)),
    onClick: () => get(currentDataGrid).revertAllChanges(),
  });

  registerCommand({
    id: 'dataGrid.deleteSelectedRows',
    category: 'Data grid',
    name: 'Delete selected rows',
    keyText: 'Ctrl+Delete',
    enabledStore: derived(currentDataGrid, grid => grid?.getGrider()?.editable),
    onClick: () => get(currentDataGrid).deleteSelectedRows(),
  });

  registerCommand({
    id: 'dataGrid.insertNewRow',
    category: 'Data grid',
    name: 'Insert new row',
    keyText: 'Insert',
    enabledStore: derived(currentDataGrid, grid => grid?.getGrider()?.editable),
    onClick: () => get(currentDataGrid).insertNewRow(),
  });

  registerCommand({
    id: 'dataGrid.setNull',
    category: 'Data grid',
    name: 'Set NULL',
    keyText: 'Ctrl+0',
    enabledStore: derived(currentDataGrid, grid => grid?.getGrider()?.editable),
    onClick: () => get(currentDataGrid).setNull(),
  });

  registerCommand({
    id: 'dataGrid.undo',
    category: 'Data grid',
    name: 'Undo',
    keyText: 'Ctrl+Z',
    icon: 'icon undo',
    toolbar: true,
    enabledStore: derived(currentDataGridChangeSet, (changeSet: any) => changeSet?.canUndo),
    onClick: () => get(currentDataGrid).undo(),
  });

  registerCommand({
    id: 'dataGrid.redo',
    category: 'Data grid',
    name: 'Redo',
    keyText: 'Ctrl+Y',
    enabledStore: derived(currentDataGridChangeSet, (changeSet: any) => changeSet?.canRedo),
    onClick: () => get(currentDataGrid).redo(),
  });

  registerCommand({
    id: 'dataGrid.reconnect',
    category: 'Data grid',
    name: 'Reconnect',
    enabledStore: derived(currentDataGrid, grid => grid != null),
    onClick: () => get(currentDataGrid).reconnect(),
  });

  registerCommand({
    id: 'dataGrid.copyToClipboard',
    category: 'Data grid',
    name: 'Copy to clipboard',
    keyText: 'Ctrl+C',
    enabledStore: derived(currentDataGrid, grid => grid != null),
    onClick: () => get(currentDataGrid).copyToClipboard(),
  });

  function getRowCountInfo(selectedCells, grider, realColumnUniqueNames, selectedRowData, allRowCount) {
    if (selectedCells.length > 1 && selectedCells.every(x => _.isNumber(x[0]) && _.isNumber(x[1]))) {
      let sum = _.sumBy(selectedCells, cell => {
        const row = grider.getRowData(cell[0]);
        if (row) {
          const colName = realColumnUniqueNames[cell[1]];
          if (colName) {
            const data = row[colName];
            if (!data) return 0;
            let num = +data;
            if (_.isNaN(num)) return 0;
            return num;
          }
        }
        return 0;
      });
      let count = selectedCells.length;
      let rowCount = selectedRowData.length;
      return `Rows: ${rowCount.toLocaleString()}, Count: ${count.toLocaleString()}, Sum:${sum.toLocaleString()}`;
    }
    if (allRowCount == null) return 'Loading row count...';
    return `Rows: ${allRowCount.toLocaleString()}`;
  }
</script>

<script lang="ts">
  import { changeSetContainsChanges, GridDisplay } from 'dbgate-datalib';
  import { get_current_component } from 'svelte/internal';
  import _ from 'lodash';
  import { writable, get, derived } from 'svelte/store';
  import registerCommand from '../commands/registerCommand';
  import ColumnHeaderControl from './ColumnHeaderControl.svelte';
  import DataGridRow from './DataGridRow.svelte';
  import { getFilterType, getFilterValueExpression } from 'dbgate-filterparser';
  import stableStringify from 'json-stable-stringify';
  import contextMenu from '../utility/contextMenu';
  import { tick } from 'svelte';
  import {
    cellIsSelected,
    countColumnSizes,
    countVisibleRealColumns,
    filterCellForRow,
    filterCellsForRow,
  } from './gridutil';
  import HorizontalScrollBar from './HorizontalScrollBar.svelte';
  import { cellFromEvent, emptyCellArray, getCellRange, isRegularCell, nullCell, topLeftCell } from './selection';
  import VerticalScrollBar from './VerticalScrollBar.svelte';
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import InlineButton from '../elements/InlineButton.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import DataFilterControl from './DataFilterControl.svelte';
  import createReducer from '../utility/createReducer';
  import keycodes from '../utility/keycodes';
  import { nullStore } from '../stores';
  import memberStore from '../utility/memberStore';
  import axios from '../utility/axios';
  import { copyTextToClipboard } from '../utility/clipboard';

  export let loadNextData = undefined;
  export let grider = undefined;
  export let display: GridDisplay = undefined;
  export let conid = undefined;
  export let database = undefined;
  export let frameSelection = undefined;
  export let isLoading = false;
  export let allRowCount = undefined;
  export let onReferenceSourceChanged = undefined;
  export let onReferenceClick = undefined;
  export let onSave;

  export let isLoadedAll;
  export let loadedTime;
  export let changeSetStore;

  const wheelRowCount = 5;
  const instance = get_current_component();

  let containerHeight = 0;
  let containerWidth = 0;
  let rowHeight = 0;
  let firstVisibleRowScrollIndex = 0;
  let firstVisibleColumnScrollIndex = 0;

  let domFocusField;
  let domHorizontalScroll;
  let domVerticalScroll;

  let currentCell = topLeftCell;
  let selectedCells = [topLeftCell];
  let dragStartCell = nullCell;
  let shiftDragStartCell = nullCell;
  let autofillDragStartCell = nullCell;
  let autofillSelectedCells = emptyCellArray;

  export function refresh() {
    display.reload();
  }

  export function save() {
    if (onSave) onSave();
  }

  export function getGrider() {
    return grider;
  }

  export function getChangeSetStore() {
    return changeSetStore;
  }

  export function revertRowChanges() {
    grider.beginUpdate();
    for (const index of getSelectedRowIndexes()) {
      if (_.isNumber(index)) grider.revertRowChanges(index);
    }
    grider.endUpdate();
  }

  export function revertAllChanges() {
    grider.revertAllChanges();
  }

  export function deleteSelectedRows() {
    grider.beginUpdate();
    for (const index of getSelectedRowIndexes()) {
      if (_.isNumber(index)) grider.deleteRow(index);
    }
    grider.endUpdate();
  }

  export function insertNewRow() {
    if (grider.canInsert) {
      const rowIndex = grider.insertRow();
      const cell = [rowIndex, (currentCell && currentCell[1]) || 0];
      // @ts-ignore
      currentCell = cell;
      // @ts-ignore
      selectedCells = [cell];
      scrollIntoView(cell);
    }
  }

  export function setNull() {
    grider.beginUpdate();
    selectedCells.filter(isRegularCell).forEach(cell => {
      setCellValue(cell, null);
    });
    grider.endUpdate();
  }

  export function undo() {
    grider.undo();
  }

  export function redo() {
    grider.redo();
  }

  export async function reconnect() {
    await axios.post('database-connections/refresh', { conid, database });
    display.reload();
  }

  export function copyToClipboard() {
    const cells = cellsToRegularCells(selectedCells);
    const rowIndexes = _.sortBy(_.uniq(cells.map(x => x[0])));
    const lines = rowIndexes.map(rowIndex => {
      let colIndexes = _.sortBy(cells.filter(x => x[0] == rowIndex).map(x => x[1]));
      const rowData = grider.getRowData(rowIndex);
      if (!rowData) return '';
      const line = colIndexes
        .map(col => realColumnUniqueNames[col])
        .map(col => (rowData[col] == null ? '(NULL)' : rowData[col]))
        .join('\t');
      return line;
    });
    const text = lines.join('\r\n');
    copyTextToClipboard(text);
  }

  $: autofillMarkerCell =
    selectedCells && selectedCells.length > 0 && _.uniq(selectedCells.map(x => x[0])).length == 1
      ? [_.max(selectedCells.map(x => x[0])), _.max(selectedCells.map(x => x[1]))]
      : null;

  // $: firstVisibleRowScrollIndex = 0;
  // $: visibleRowCountUpperBound = 25;

  // $: console.log('grider', grider);
  $: columns = display.allColumns;

  $: columnSizes = countColumnSizes(grider, columns, containerWidth, display);

  $: headerColWidth = 40;

  $: gridScrollAreaHeight = containerHeight - 2 * rowHeight;
  $: gridScrollAreaWidth = containerWidth - columnSizes.frozenSize - headerColWidth - 32;

  $: visibleRowCountUpperBound = Math.ceil(gridScrollAreaHeight / Math.floor(Math.max(1, rowHeight)));
  $: visibleRowCountLowerBound = Math.floor(gridScrollAreaHeight / Math.ceil(Math.max(1, rowHeight)));

  $: visibleRealColumns = countVisibleRealColumns(
    columnSizes,
    firstVisibleColumnScrollIndex,
    gridScrollAreaWidth,
    columns
  );

  // $: console.log('visibleRealColumns', visibleRealColumns);
  // $: console.log('visibleRowCountUpperBound', visibleRowCountUpperBound);
  // $: console.log('rowHeight', rowHeight);
  // $: console.log('containerHeight', containerHeight);

  $: realColumnUniqueNames = _.range(columnSizes.realCount).map(
    realIndex => (columns[columnSizes.realToModel(realIndex)] || {}).uniqueName
  );

  $: maxScrollColumn = columnSizes.scrollInView(0, columns.length - 1 - columnSizes.frozenCount, gridScrollAreaWidth);

  $: {
    if (loadNextData && firstVisibleRowScrollIndex + visibleRowCountUpperBound >= grider.rowCount) {
      loadNextData();
    }
  }

  $: {
    tick().then(() => {
      if (display && display.focusedColumn) {
        const invMap = _.invert(realColumnUniqueNames);
        const colIndex = invMap[display.focusedColumn];
        if (colIndex) {
          scrollIntoView([null, colIndex]);
        }
      }
    });
  }

  $: {
    const _unused = selectedCells;
    if (onReferenceSourceChanged && (grider.rowCount > 0 || isLoadedAll)) {
      onReferenceSourceChanged(getSelectedRowData(), loadedTime);
    }
  }

  // $: console.log('DISPLAY.config', display.config);
  $: {
    if (display.groupColumns && display.baseTable) {
      onReferenceClick({
        referenceId: stableStringify(display && display.groupColumns),
        schemaName: display.baseTable.schemaName,
        pureName: display.baseTable.pureName,
        columns: display.groupColumns.map(col => ({
          baseName: col,
          refName: col,
          dataType: _.get(display.baseTable && display.baseTable.columns.find(x => x.columnName == col), 'dataType'),
        })),
      });
    }
  }

  function scrollIntoView(cell) {
    const [row, col] = cell;

    if (row != null) {
      let newRow = null;
      const rowCount = grider.rowCount;
      if (rowCount == 0) return;

      if (row < firstVisibleRowScrollIndex) newRow = row;
      else if (row + 1 >= firstVisibleRowScrollIndex + visibleRowCountLowerBound)
        newRow = row - visibleRowCountLowerBound + 2;

      if (newRow < 0) newRow = 0;
      if (newRow >= rowCount) newRow = rowCount - 1;

      if (newRow != null) {
        firstVisibleRowScrollIndex = newRow;
        domVerticalScroll.scroll(newRow);
      }
    }

    if (col != null) {
      if (col >= columnSizes.frozenCount) {
        let newColumn = columnSizes.scrollInView(
          firstVisibleColumnScrollIndex,
          col - columnSizes.frozenCount,
          gridScrollAreaWidth
        );
        firstVisibleColumnScrollIndex = newColumn;

        domHorizontalScroll.scroll(newColumn);
      }
    }
  }

  function handleGridMouseDown(event) {
    if (event.target.closest('.buttonLike')) return;
    if (event.target.closest('.resizeHandleControl')) return;
    if (event.target.closest('input')) return;

    // event.target.closest('table').focus();
    event.preventDefault();
    if (domFocusField) domFocusField.focus();
    const cell = cellFromEvent(event);

    if (event.button == 2 && cell && cellIsSelected(cell[0], cell[1], selectedCells)) return;

    const autofill = event.target.closest('div.autofillHandleMarker');
    if (autofill) {
      autofillDragStartCell = cell;
    } else {
      const oldCurrentCell = currentCell;
      currentCell = cell;

      if (event.ctrlKey) {
        if (isRegularCell(cell)) {
          if (selectedCells.find(x => x[0] == cell[0] && x[1] == cell[1])) {
            selectedCells = selectedCells.filter(x => x[0] != cell[0] || x[1] != cell[1]);
          } else {
            selectedCells = [...selectedCells, cell];
          }
        }
      } else {
        selectedCells = getCellRange(cell, cell);
        dragStartCell = cell;

        if (isRegularCell(cell) && !_.isEqual(cell, inplaceEditorState.cell) && _.isEqual(cell, oldCurrentCell)) {
          dispatchInsplaceEditor({ type: 'show', cell, selectAll: true });
        } else if (!_.isEqual(cell, inplaceEditorState.cell)) {
          dispatchInsplaceEditor({ type: 'close' });
        }
      }
    }

    if (display.focusedColumn) display.focusColumn(null);
  }

  function handleGridMouseMove(event) {
    if (autofillDragStartCell) {
      const cell = cellFromEvent(event);
      if (isRegularCell(cell) && (cell[0] == autofillDragStartCell[0] || cell[1] == autofillDragStartCell[1])) {
        const autoFillStart = [selectedCells[0][0], _.min(selectedCells.map(x => x[1]))];
        // @ts-ignore
        autofillSelectedCells = getCellRange(autoFillStart, cell);
      }
    } else if (dragStartCell) {
      const cell = cellFromEvent(event);
      currentCell = cell;
      selectedCells = getCellRange(dragStartCell, cell);
    }
  }

  function handleGridMouseUp(event) {
    if (dragStartCell) {
      const cell = cellFromEvent(event);
      currentCell = cell;
      selectedCells = getCellRange(dragStartCell, cell);
      dragStartCell = null;
    }
    if (autofillDragStartCell) {
      const currentRowNumber = currentCell[0];
      if (_.isNumber(currentRowNumber)) {
        const rowIndexes = _.uniq((autofillSelectedCells || []).map(x => x[0])).filter(x => x != currentRowNumber);
        const colNames = selectedCells.map(cell => realColumnUniqueNames[cell[1]]);
        const changeObject = _.pick(grider.getRowData(currentRowNumber), colNames);
        grider.beginUpdate();
        for (const index of rowIndexes) grider.updateRow(index, changeObject);
        grider.endUpdate();
      }

      autofillDragStartCell = null;
      autofillSelectedCells = [];
      selectedCells = autofillSelectedCells;
    }
  }

  function handleGridWheel(event) {
    let newFirstVisibleRowScrollIndex = firstVisibleRowScrollIndex;
    if (event.deltaY > 0) {
      newFirstVisibleRowScrollIndex += wheelRowCount;
    }
    if (event.deltaY < 0) {
      newFirstVisibleRowScrollIndex -= wheelRowCount;
    }
    let rowCount = grider.rowCount;
    if (newFirstVisibleRowScrollIndex + visibleRowCountLowerBound > rowCount) {
      newFirstVisibleRowScrollIndex = rowCount - visibleRowCountLowerBound + 1;
    }
    if (newFirstVisibleRowScrollIndex < 0) {
      newFirstVisibleRowScrollIndex = 0;
    }
    firstVisibleRowScrollIndex = newFirstVisibleRowScrollIndex;

    domVerticalScroll.scroll(newFirstVisibleRowScrollIndex);
  }

  function getSelectedRowIndexes() {
    if (selectedCells.find(x => x[0] == 'header')) return _.range(0, grider.rowCount);
    return _.uniq((selectedCells || []).map(x => x[0])).filter(x => _.isNumber(x));
  }

  function getSelectedColumnIndexes() {
    if (selectedCells.find(x => x[1] == 'header')) return _.range(0, realColumnUniqueNames.length);
    return _.uniq((selectedCells || []).map(x => x[1])).filter(x => _.isNumber(x));
  }

  function getSelectedRowData() {
    return _.compact(getSelectedRowIndexes().map(index => grider.getRowData(index)));
  }

  function getSelectedColumns() {
    return _.compact(
      getSelectedColumnIndexes().map(index => ({
        columnName: realColumnUniqueNames[index],
      }))
    );
  }

  function handleGridKeyDown(event) {
    if (event.keyCode == keycodes.f5) {
      event.preventDefault();
      display.reload();
    }

    // if (event.keyCode == keycodes.f4) {
    //   event.preventDefault();
    //   handleSwitchToFormView();
    // }

    // if (event.keyCode == keycodes.s && event.ctrlKey) {
    //   event.preventDefault();
    //   handleSave();
    //   // this.saveAndFocus();
    // }

    // if (event.keyCode == keycodes.n0 && event.ctrlKey) {
    //   event.preventDefault();
    //   setNull();
    // }

    // if (event.keyCode == keycodes.r && event.ctrlKey) {
    //   event.preventDefault();
    //   revertRowChanges();
    // }

    // if (event.keyCode == keycodes.f && event.ctrlKey) {
    //   event.preventDefault();
    //   filterSelectedValue();
    // }

    // if (event.keyCode == keycodes.z && event.ctrlKey) {
    //   event.preventDefault();
    //   undo();
    // }

    // if (event.keyCode == keycodes.y && event.ctrlKey) {
    //   event.preventDefault();
    //   redo();
    // }

    // if (event.keyCode == keycodes.c && event.ctrlKey) {
    //   event.preventDefault();
    //   copyToClipboard();
    // }

    // if (event.keyCode == keycodes.delete && event.ctrlKey) {
    //   event.preventDefault();
    //   deleteSelectedRows();
    //   // this.saveAndFocus();
    // }

    // if (event.keyCode == keycodes.insert && !event.ctrlKey) {
    //   event.preventDefault();
    //   insertNewRow();
    //   // this.saveAndFocus();
    // }

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

    if (event.shiftKey) {
      if (!isRegularCell(shiftDragStartCell)) {
        shiftDragStartCell = currentCell;
      }
    } else {
      shiftDragStartCell = nullCell;
    }

    handleCursorMove(event);

    if (event.shiftKey) {
      selectedCells = getCellRange(shiftDragStartCell || currentCell, currentCell);
    }
  }

  function handleCursorMove(event) {
    if (!isRegularCell(currentCell)) return null;
    let rowCount = grider.rowCount;
    if (event.ctrlKey) {
      switch (event.keyCode) {
        case keycodes.upArrow:
        case keycodes.pageUp:
          return moveCurrentCell(0, currentCell[1], event);
        case keycodes.downArrow:
        case keycodes.pageDown:
          return moveCurrentCell(rowCount - 1, currentCell[1], event);
        case keycodes.leftArrow:
          return moveCurrentCell(currentCell[0], 0, event);
        case keycodes.rightArrow:
          return moveCurrentCell(currentCell[0], columnSizes.realCount - 1, event);
        case keycodes.home:
          return moveCurrentCell(0, 0, event);
        case keycodes.end:
          return moveCurrentCell(rowCount - 1, columnSizes.realCount - 1, event);
        case keycodes.a:
          selectedCells = [['header', 'header']];
          event.preventDefault();
          return ['header', 'header'];
      }
    } else {
      switch (event.keyCode) {
        case keycodes.upArrow:
          // if (currentCell[0] == 0) return focusFilterEditor(currentCell[1]);
          return moveCurrentCell(currentCell[0] - 1, currentCell[1], event);
        case keycodes.downArrow:
        case keycodes.enter:
          return moveCurrentCell(currentCell[0] + 1, currentCell[1], event);
        case keycodes.leftArrow:
          return moveCurrentCell(currentCell[0], currentCell[1] - 1, event);
        case keycodes.rightArrow:
          return moveCurrentCell(currentCell[0], currentCell[1] + 1, event);
        case keycodes.home:
          return moveCurrentCell(currentCell[0], 0, event);
        case keycodes.end:
          return moveCurrentCell(currentCell[0], columnSizes.realCount - 1, event);
        case keycodes.pageUp:
          return moveCurrentCell(currentCell[0] - visibleRowCountLowerBound, currentCell[1], event);
        case keycodes.pageDown:
          return moveCurrentCell(currentCell[0] + visibleRowCountLowerBound, currentCell[1], event);
      }
    }
    return null;
  }

  function setCellValue(cell, value) {
    grider.setCellValue(cell[0], realColumnUniqueNames[cell[1]], value);
  }

  function moveCurrentCell(row, col, event = null) {
    const rowCount = grider.rowCount;

    if (row < 0) row = 0;
    if (row >= rowCount) row = rowCount - 1;
    if (col < 0) col = 0;
    if (col >= columnSizes.realCount) col = columnSizes.realCount - 1;
    currentCell = [row, col];
    // setSelectedCells([...(event.ctrlKey ? selectedCells : []), [row, col]]);
    selectedCells = [[row, col]];
    scrollIntoView([row, col]);
    // this.selectedCells.push(this.currentCell);
    // this.scrollIntoView(this.currentCell);

    if (event) event.preventDefault();
    return [row, col];
  }

  function handlePaste(event) {
    var pastedText = undefined;
    // @ts-ignore
    if (window.clipboardData && window.clipboardData.getData) {
      // IE
      // @ts-ignore
      pastedText = window.clipboardData.getData('Text');
    } else if (event.clipboardData && event.clipboardData.getData) {
      pastedText = event.clipboardData.getData('text/plain');
    }
    event.preventDefault();
    grider.beginUpdate();
    const pasteRows = pastedText
      .replace(/\r/g, '')
      .split('\n')
      .map(row => row.split('\t'));
    const selectedRegular = cellsToRegularCells(selectedCells);
    if (selectedRegular.length <= 1) {
      const startRow = isRegularCell(currentCell) ? currentCell[0] : grider.rowCount;
      const startCol = isRegularCell(currentCell) ? currentCell[1] : 0;
      let rowIndex = startRow;
      for (const rowData of pasteRows) {
        if (rowIndex >= grider.rowCountInUpdate) {
          grider.insertRow();
        }
        let colIndex = startCol;
        for (const cell of rowData) {
          setCellValue([rowIndex, colIndex], cell == '(NULL)' ? null : cell);
          colIndex += 1;
        }
        rowIndex += 1;
      }
    }
    if (selectedRegular.length > 1) {
      const startRow: number = _.min(selectedRegular.map(x => x[0]));
      const startCol: number = _.min(selectedRegular.map(x => x[1]));
      for (const cell of selectedRegular) {
        const [rowIndex, colIndex] = cell;
        const selectionRow = rowIndex - startRow;
        const selectionCol = colIndex - startCol;
        const pasteRow = pasteRows[selectionRow % pasteRows.length];
        const pasteCell = pasteRow[selectionCol % pasteRow.length];
        setCellValue(cell, pasteCell);
      }
    }
    grider.endUpdate();
  }

  function cellsToRegularCells(cells) {
    cells = _.flatten(
      cells.map(cell => {
        if (cell[1] == 'header') {
          return _.range(0, columnSizes.count).map(col => [cell[0], col]);
        }
        return [cell];
      })
    );
    cells = _.flatten(
      cells.map(cell => {
        if (cell[0] == 'header') {
          return _.range(0, grider.rowCount).map(row => [row, cell[1]]);
        }
        return [cell];
      })
    );
    return cells.filter(isRegularCell);
  }

  const [inplaceEditorState, dispatchInsplaceEditor] = createReducer((state, action) => {
    switch (action.type) {
      case 'show':
        if (!grider.editable) return {};
        return {
          cell: action.cell,
          text: action.text,
          selectAll: action.selectAll,
        };
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
      { command: 'dataGrid.refresh' },
      { command: 'dataGrid.copyToClipboard' },
      { divider: true },
      { command: 'dataGrid.save' },
      { command: 'dataGrid.revertRowChanges' },
      { command: 'dataGrid.revertAllChanges' },
      { command: 'dataGrid.deleteSelectedRows' },
      { command: 'dataGrid.insertNewRow' },
      { command: 'dataGrid.setNull' },
      { divider: true },
      { command: 'dataGrid.undo' },
      { command: 'dataGrid.redo' },
    ];
  }
</script>

<div
  class="container"
  bind:clientWidth={containerWidth}
  bind:clientHeight={containerHeight}
  use:contextMenu={createMenu}
>
  <input
    type="text"
    class="focus-field"
    bind:this={domFocusField}
    on:keydown={handleGridKeyDown}
    on:focus={() => {
      currentDataGrid.set(instance);
    }}
    on:paste={handlePaste}
  />
  <table
    class="table"
    on:mousedown={handleGridMouseDown}
    on:mousemove={handleGridMouseMove}
    on:mouseup={handleGridMouseUp}
    on:wheel={handleGridWheel}
  >
    <thead>
      <tr>
        <td
          class="header-cell"
          data-row="header"
          data-col="header"
          bind:clientHeight={rowHeight}
          style={`width:${headerColWidth}px; min-width:${headerColWidth}px; max-width:${headerColWidth}px`}
        />
        {#each visibleRealColumns as col (col.uniqueName)}
          <td
            class="header-cell"
            data-row="header"
            data-col={col.colIndex}
            style={`width:${col.width}px; min-width:${col.width}px; max-width:${col.width}px`}
          >
            <ColumnHeaderControl
              column={col}
              {conid}
              {database}
              setSort={display.sortable ? order => display.setSort(col.uniqueName, order) : null}
              order={display.getSortOrder(col.uniqueName)}
              on:resizeSplitter={e => {
                // @ts-ignore
                display.resizeColumn(col.uniqueName, col.width, e.detail);
              }}
              setGrouping={display.sortable ? groupFunc => display.setGrouping(col.uniqueName, groupFunc) : null}
              grouping={display.getGrouping(col.uniqueName)}
            />
          </td>
        {/each}
      </tr>
      {#if display.filterable}
        <tr>
          <td
            class="header-cell"
            data-row="filter"
            data-col="header"
            style={`width:${headerColWidth}px; min-width:${headerColWidth}px; max-width:${headerColWidth}px`}
          >
            {#if display.filterCount > 0}
              <InlineButton on:click={() => display.clearFilters()} square>
                <FontIcon icon="icon filter-off" />
              </InlineButton>
            {/if}
          </td>
          {#each visibleRealColumns as col (col.uniqueName)}
            <td
              class="filter-cell"
              data-row="filter"
              data-col={col.colIndex}
              style={`width:${col.width}px; min-width:${col.width}px; max-width:${col.width}px`}
            >
              <DataFilterControl
                filterType={getFilterType(col.dataType)}
                filter={display.getFilter(col.uniqueName)}
                setFilter={value => display.setFilter(col.uniqueName, value)}
                showResizeSplitter
                on:resizeSplitter={e => {
                  // @ts-ignore
                  display.resizeColumn(col.uniqueName, col.width, e.detail);
                }}
              />
            </td>
          {/each}
        </tr>
      {/if}
    </thead>
    <tbody>
      {#each _.range(firstVisibleRowScrollIndex, Math.min(firstVisibleRowScrollIndex + visibleRowCountUpperBound, grider.rowCount)) as rowIndex (rowIndex)}
        <DataGridRow
          {rowIndex}
          {grider}
          {visibleRealColumns}
          {rowHeight}
          {autofillSelectedCells}
          selectedCells={filterCellsForRow(selectedCells, rowIndex)}
          autofillMarkerCell={filterCellForRow(autofillMarkerCell, rowIndex)}
          focusedColumn={display.focusedColumn}
          inplaceEditorState={$inplaceEditorState}
          {dispatchInsplaceEditor}
          {frameSelection}
        />
      {/each}
    </tbody>
  </table>
  <HorizontalScrollBar
    minimum={0}
    maximum={maxScrollColumn}
    viewportRatio={gridScrollAreaWidth / columnSizes.getVisibleScrollSizeSum()}
    on:scroll={e => (firstVisibleColumnScrollIndex = e.detail)}
    bind:this={domHorizontalScroll}
  />
  <VerticalScrollBar
    minimum={0}
    maximum={grider.rowCount - visibleRowCountUpperBound + 2}
    viewportRatio={visibleRowCountUpperBound / grider.rowCount}
    on:scroll={e => (firstVisibleRowScrollIndex = e.detail)}
    bind:this={domVerticalScroll}
  />
  {#if allRowCount}
    <div class="row-count-label">
      {getRowCountInfo(selectedCells, grider, realColumnUniqueNames, getSelectedRowData(), allRowCount)}
    </div>
  {/if}

  {#if isLoading}
    <LoadingInfo wrapper message="Loading data" />
  {/if}
</div>

<style>
  .container {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    user-select: none;
    overflow: hidden;
  }
  .table {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 20px;
    overflow: scroll;
    border-collapse: collapse;
    outline: none;
  }
  .header-cell {
    border: 1px solid var(--theme-border);
    text-align: left;
    padding: 0;
    margin: 0;
    background-color: var(--theme-bg-1);
    overflow: hidden;
  }
  .filter-cell {
    text-align: left;
    overflow: hidden;
    margin: 0;
    padding: 0;
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
