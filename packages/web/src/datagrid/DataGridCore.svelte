<script lang="ts" context="module">
  const currentDataGrid = writable(null);

  registerCommand({
    id: 'dataGrid.refresh',
    category: 'Data grid',
    name: 'Refresh',
    keyText: 'F5',
    toolbar: true,
    icon: 'icon reload',
    enabledStore: derived([currentDataGrid], ([grid]) => grid != null),
    onClick: () => get(currentDataGrid).refresh(),
  });
</script>

<script lang="ts">
  import { GridDisplay } from 'dbgate-datalib';
  import _ from 'lodash';
  import { writable, get, derived } from 'svelte/store';
  import registerCommand from '../commands/registerCommand';
  import ColumnHeaderControl from './ColumnHeaderControl.svelte';
  import DataGridRow from './DataGridRow.svelte';
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

  export let loadNextData = undefined;
  export let grider = undefined;
  export let display: GridDisplay = undefined;
  export let conid = undefined;
  export let database = undefined;
  export let frameSelection = undefined;
  export let instance = undefined;

  const wheelRowCount = 5;

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

        // if (isRegularCell(cell) && !_.isEqual(cell, inplaceEditorState.cell) && _.isEqual(cell, currentCell)) {
        //   // @ts-ignore
        //   dispatchInsplaceEditor({ type: 'show', cell, selectAll: true });
        // } else if (!_.isEqual(cell, inplaceEditorState.cell)) {
        //   // @ts-ignore
        //   dispatchInsplaceEditor({ type: 'close' });
        // }
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

  export function refresh() {
    display.reload();
  }
</script>

<div class="container" bind:clientWidth={containerWidth} bind:clientHeight={containerHeight}>
  <input
    type="text"
    class="focus-field"
    bind:this={domFocusField}
    on:focus={() => {
      currentDataGrid.set(instance);
    }}
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
            <ColumnHeaderControl column={col} {conid} {database} />
          </td>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each _.range(firstVisibleRowScrollIndex, firstVisibleRowScrollIndex + visibleRowCountUpperBound) as rowIndex (rowIndex)}
        <DataGridRow
          {rowIndex}
          {grider}
          {visibleRealColumns}
          {rowHeight}
          {autofillSelectedCells}
          selectedCells={filterCellsForRow(selectedCells, rowIndex)}
          autofillMarkerCell={filterCellForRow(autofillMarkerCell, rowIndex)}
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
</div>

<style>
  .container {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    user-select: none;
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
