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
  import { GridDisplay } from 'dbgate-datalib';
  import { get_current_component } from 'svelte/internal';
  import _ from 'lodash';
  import { writable, get, derived } from 'svelte/store';
  import registerCommand from '../commands/registerCommand';
  import ColumnHeaderControl from './ColumnHeaderControl.svelte';
  import DataGridRow from './DataGridRow.svelte';
  import { getFilterType, getFilterValueExpression } from 'dbgate-filterparser';
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

  export let loadNextData = undefined;
  export let grider = undefined;
  export let display: GridDisplay = undefined;
  export let conid = undefined;
  export let database = undefined;
  export let frameSelection = undefined;
  export let isLoading = false;
  export let allRowCount = undefined;
  export let onReferenceSourceChanged = undefined;

  export let isLoadedAll;
  export let loadedTime;

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
