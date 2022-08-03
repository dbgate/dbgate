<script lang="ts" context="module">
  const getCurrentEditor = () => getActiveComponent('PerspectiveTable');

  registerCommand({
    id: 'perspective.openJson',
    category: 'Perspective',
    name: 'Open JSON',
    isRelatedToTab: true,
    testEnabled: () => getCurrentEditor()?.openJsonEnabled(),
    onClick: () => getCurrentEditor().openJson(),
  });
</script>

<script lang="ts">
  import { PerspectiveDisplay, PerspectiveTreeNode, PERSPECTIVE_PAGE_SIZE } from 'dbgate-datalib';
  import _, { values } from 'lodash';
  import { onMount, tick } from 'svelte';
  import resizeObserver from '../utility/resizeObserver';
  import debug from 'debug';
  import contextMenu from '../utility/contextMenu';
  import DataFilterControl from '../datagrid/DataFilterControl.svelte';
  import ErrorInfo from '../elements/ErrorInfo.svelte';
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import registerCommand from '../commands/registerCommand';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import { openJsonDocument } from '../tabs/JsonTab.svelte';
  import PerspectiveCell from './PerspectiveCell.svelte';
  import DataGridCell from '../datagrid/DataGridCell.svelte';
  import PerspectiveLoadingIndicator from './PerspectiveLoadingIndicator.svelte';
  import PerspectiveHeaderControl from './PerspectiveHeaderControl.svelte';
  import createRef from '../utility/createRef';

  const dbg = debug('dbgate:PerspectivaTable');
  export const activator = createActivator('PerspectiveTable', true);

  export let root: PerspectiveTreeNode;
  export let loadedCounts;
  export let config;
  export let setConfig;

  let dataRows;
  let domWrapper;
  let domTable;
  let errorMessage;
  let isLoading = false;
  const lastVisibleRowIndexRef = createRef(0);
  const disableLoadNextRef = createRef(false);

  async function loadLevelData(node: PerspectiveTreeNode, parentRows: any[], counts) {
    dbg('load level data', counts);
    // const loadProps: PerspectiveDataLoadPropsWithNode[] = [];
    const loadChildNodes = [];
    const loadChildRows = [];
    const loadProps = node.getNodeLoadProps(parentRows);
    let { rows, incomplete } = await node.dataProvider.loadData({
      ...loadProps,
      topCount: counts[node.uniqueName] || PERSPECTIVE_PAGE_SIZE,
    });
    // console.log('ROWS', rows, node.isRoot);

    if (node.isRoot) {
      parentRows.push(...rows);
      // console.log('PUSH PARENTROWS', parentRows);

      if (incomplete) {
        parentRows.push({
          incompleteRowsIndicator: [node.uniqueName],
        });
      }
    } else {
      let lastRowWithChildren = null;
      for (const parentRow of parentRows) {
        const childRows = rows.filter(row => node.matchChildRow(parentRow, row));
        parentRow[node.fieldName] = childRows;
        if (childRows.length > 0) {
          lastRowWithChildren = parentRow;
        }
      }
      if (incomplete && lastRowWithChildren) {
        lastRowWithChildren[node.fieldName].push({
          incompleteRowsIndicator: [node.uniqueName],
        });
      }
    }

    for (const child of node.childNodes) {
      if (child.isExpandable && child.isChecked) {
        await loadLevelData(child, rows, counts);
        // loadProps.push(child.getNodeLoadProps());
      }
    }

    //   loadProps.push({
    //     props: node.getNodeLoadProps(parentRows),
    //     node,
    //   });

    // const grouped = groupPerspectiveLoadProps(...loadProps);
    // for (const item of grouped) {
    //   const rows = await item.node.loader(item.props);
    //   if (item.node.isRoot) {
    //     parentRows.push(...rows);
    //   } else {
    //     const childRows = rows.filter(row => node.matchChildRow(row));
    //   }
    // }
  }

  async function loadData(node: PerspectiveTreeNode, counts) {
    // console.log('LOADING', node);
    if (!node) return;
    const rows = [];
    isLoading = true;
    try {
      await loadLevelData(node, rows, counts);
      dataRows = rows;
      dbg('data rows', rows);
      errorMessage = null;
    } catch (err) {
      console.error(err);
      errorMessage = err.message;
      dataRows = null;
    }
    isLoading = false;
    // console.log('DISPLAY ROWS', rows);
    // const rows = await node.loadLevelData();
    // for (const child of node.childNodes) {
    //   const loadProps = [];
    //   if (child.isExpandable && child.isChecked) {
    //     loadProps.push(child.getNodeLoadProps());
    //   }
    // }
  }

  export function openJson() {
    openJsonDocument(dataRows);
  }

  export function openJsonEnabled() {
    return dataRows != null;
  }

  onMount(() => {});

  $: loadData(root, $loadedCounts);
  $: display = root && dataRows ? new PerspectiveDisplay(root, dataRows) : null;

  $: {
    display;
    disableLoadNextRef.set(false);
    checkLoadAdditionalData();
  }

  function buildMenu() {
    return [
      {
        command: 'perspective.refresh',
      },
      {
        command: 'perspective.openJson',
      },
      {
        command: 'perspective.customJoin',
      },
    ];
  }

  function getLastVisibleRowIndex() {
    var rows = domTable.querySelectorAll('tbody>tr');
    const wrapBox = domWrapper.getBoundingClientRect();

    function indexIsLastVisible(index) {
      if (index < 0 || index >= rows.length) {
        return false;
      }

      const box = rows[index].getBoundingClientRect();

      if (index == rows.length - 1) {
        return wrapBox.bottom >= box.top;
      }

      return box.top <= wrapBox.bottom && box.bottom >= wrapBox.bottom;
    }

    const lastValue = lastVisibleRowIndexRef.get();

    let d = 0;
    while (lastValue - d >= 0 || lastValue + d < rows.length) {
      if (indexIsLastVisible(lastValue - d)) {
        lastVisibleRowIndexRef.set(lastValue - d);
        return lastValue - d;
      }
      if (indexIsLastVisible(lastValue + d)) {
        lastVisibleRowIndexRef.set(lastValue + d);
        return lastValue + d;
      }
      d += 1;
    }

    return 0;

    // let rowIndex = 0;
    // // let lastTr = null;
    // for (const row of rows) {
    //   const box = row.getBoundingClientRect();
    //   // console.log('BOX', box);
    //   if (box.y > wrapBox.bottom) {
    //     break;
    //   }
    //   // if (box.y > domWrapper.scrollTop + wrapBox.height) {
    //   //   break;
    //   // }
    //   // lastTr = row;
    //   rowIndex += 1;
    // }
    // return rowIndex;
  }

  async function checkLoadAdditionalData() {
    if (!display) return;
    await tick();
    if (!domTable) return;
    if (disableLoadNextRef.get()) return;

    const rowIndex = getLastVisibleRowIndex();

    // console.log('LAST VISIBLE', rowIndex);

    const growIndicators = _.keys(display.loadIndicatorsCounts).filter(
      indicator => rowIndex + 1 >= display.loadIndicatorsCounts[indicator]
    );

    // console.log('growIndicators', growIndicators);
    // console.log('display.loadIndicatorsCounts IN', display.loadIndicatorsCounts);
    // console.log('rowIndex', rowIndex);

    if (growIndicators.length > 0) {
      disableLoadNextRef.set(true);
      dbg('load next', growIndicators);
      loadedCounts.update(counts => {
        const res = { ...counts };
        for (const id of growIndicators) {
          res[id] = (res[id] || PERSPECTIVE_PAGE_SIZE) + PERSPECTIVE_PAGE_SIZE;
        }
        return res;
      });
    }

    // console.log('LAST VISIBLE ROW', rowIndex, wrapBox.height, lastTr, lastTr.getBoundingClientRect());

    // var start = 0;
    // var end = rows.length;
    // var count = 0;

    // while (start != end) {
    //   var mid = start + Math.floor((end - start) / 2);
    //   if ($(rows[mid]).offset().top < document.documentElement.scrollTop) start = mid + 1;
    //   else end = mid;
    // }

    // console.log('SCROLL', domTable.querySelector('tr:visible:last'));
  }

  // $: console.log('display.loadIndicatorsCounts', display?.loadIndicatorsCounts);
</script>

<div
  class="wrapper"
  bind:this={domWrapper}
  use:resizeObserver={true}
  use:contextMenu={buildMenu}
  on:scroll={checkLoadAdditionalData}
>
  {#if display}
    <table bind:this={domTable}>
      <thead>
        {#each _.range(display.columnLevelCount) as columnLevel}
          <tr>
            {#each display.columns as column}
              <PerspectiveHeaderControl {column} {columnLevel} {setConfig} {config} />
            {/each}
          </tr>
        {/each}
        <tr>
          {#each display.columns as column}
            <th class="filter">
              <DataFilterControl
                filter={column.dataNode.getFilter()}
                setFilter={value => column.dataNode.setFilter(value)}
                columnName={column.dataNode.uniqueName}
                filterType={column.dataNode.filterType}
              />
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each display.rows as row}
          <tr>
            {#each display.columns as column}
              {#if !row.rowCellSkips[column.columnIndex]}
                <PerspectiveCell
                  value={row.rowData[column.columnIndex]}
                  rowSpan={row.rowSpans[column.columnIndex]}
                  rowData={row.rowData}
                />
              {/if}
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}

  {#if errorMessage}
    <ErrorInfo message={errorMessage} />

    <FormStyledButton
      value="Reset filter"
      on:click={() =>
        setConfig(
          cfg => ({
            ...cfg,
            filters: {},
          }),
          true
        )}
    />
  {/if}

  {#if isLoading}
    <div class="loader">
      <PerspectiveLoadingIndicator />
    </div>
  {/if}
</div>

<style>
  .wrapper {
    overflow: scroll;
    flex: 1;
  }

  table {
    /* position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    right: 0; */
    overflow: scroll;
    /* border-collapse: collapse; */
    outline: none;

    border-collapse: separate; /* Don't collapse */
    border-spacing: 0;
  }

  table thead {
    position: sticky;
    top: 0;
    z-index: 100;
  }

  th.filter {
    padding: 0;
  }

  thead :global(tr:first-child) :global(th) {
    border-top: 1px solid var(--theme-border);
  }

  /* 
  table {
    border: 1px solid;
    border-collapse: collapse;
  }

  td,
  th {
    border: 1px solid;
  } */

  .loader {
    position: absolute;
    right: 0;
    bottom: 0;
  }
</style>
