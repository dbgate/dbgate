<script lang="ts">
  import { GridDisplay } from 'dbgate-datalib';
  import _ from 'lodash';
  import ColumnHeaderControl from './ColumnHeaderControl.svelte';
  import DataGridRow from './DataGridRow.svelte';
  import { countColumnSizes, countVisibleRealColumns } from './gridutil';
  import HorizontalScrollBar from './HorizontalScrollBar.svelte';
  import VerticalScrollBar from './VerticalScrollBar.svelte';

  export let loadNextData = undefined;
  export let grider = undefined;
  export let display: GridDisplay = undefined;
  export let conid = undefined;
  export let database = undefined;

  let containerHeight = 0;
  let containerWidth = 0;
  let rowHeight = 0;
  let firstVisibleRowScrollIndex = 0;
  let firstVisibleColumnScrollIndex = 0;
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
</script>

<div class="container" bind:clientWidth={containerWidth} bind:clientHeight={containerHeight}>
  <input type="text" class="focus-field" />
  <table class="table">
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
        <DataGridRow {rowIndex} {grider} {visibleRealColumns} {rowHeight} />
      {/each}
    </tbody>
  </table>
  <HorizontalScrollBar
    minimum={0}
    maximum={maxScrollColumn}
    viewportRatio={gridScrollAreaWidth / columnSizes.getVisibleScrollSizeSum()}
    on:scroll={e => (firstVisibleColumnScrollIndex = e.detail)}
  />
  <VerticalScrollBar
    minimum={0}
    maximum={grider.rowCount - visibleRowCountUpperBound + 2}
    viewportRatio={visibleRowCountUpperBound / grider.rowCount}
    on:scroll={e => (firstVisibleRowScrollIndex = e.detail)}
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
