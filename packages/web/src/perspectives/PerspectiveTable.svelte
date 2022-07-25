<script lang="ts">
  import {
    // groupPerspectiveLoadProps,
    PerspectiveDataLoadProps,
    PerspectiveDataLoadPropsWithNode,
    PerspectiveDisplay,
    PerspectiveTreeNode,
  } from 'dbgate-datalib';
  import _, { range } from 'lodash';
  import { onMount } from 'svelte';
  import { prop_dev, tick } from 'svelte/internal';
  import { sleep } from '../utility/common';
  import resizeObserver from '../utility/resizeObserver';
  import PerspectiveIntersectionObserver from './PerspectiveIntersectionObserver.svelte';
  import debug from 'debug';
  import contextMenu from '../utility/contextMenu';
  import DataFilterControl from '../datagrid/DataFilterControl.svelte';
import { countVisibleRealColumns } from '../datagrid/gridutil';

  const dbg = debug('dbgate:PerspectivaTable');

  export let root: PerspectiveTreeNode;
  export let loadedCounts;
  let dataRows;
  let domWrapper;

  async function loadLevelData(node: PerspectiveTreeNode, parentRows: any[], counts) {
    dbg('load level data', counts);
    // const loadProps: PerspectiveDataLoadPropsWithNode[] = [];
    const loadChildNodes = [];
    const loadChildRows = [];
    const loadProps = node.getNodeLoadProps(parentRows);
    let { rows, incomplete } = await node.dataProvider.loadData({
      ...loadProps,
      topCount: counts[node.uniqueName] || 100,
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
    await loadLevelData(node, rows, counts);
    dataRows = rows;

    dbg('display rows', rows);
    // console.log('DISPLAY ROWS', rows);
    // const rows = await node.loadLevelData();
    // for (const child of node.childNodes) {
    //   const loadProps = [];
    //   if (child.isExpandable && child.isChecked) {
    //     loadProps.push(child.getNodeLoadProps());
    //   }
    // }
  }

  onMount(() => {});

  $: loadData(root, $loadedCounts);
  $: display = root && dataRows ? new PerspectiveDisplay(root, dataRows) : null;

  function buildMenu() {
    return [
      {
        command: 'perspective.refresh',
      },
    ];
  }
</script>

<div class="wrapper" bind:this={domWrapper} use:resizeObserver={true} use:contextMenu={buildMenu}>
  {#if display}
    <table>
      <thead>
        {#each _.range(display.columnLevelCount) as columnLevel}
          <tr>
            {#each display.columns as column}
              {#if column.isVisible(columnLevel)}
                <th rowspan={column.rowSpan}>{column.title}</th>
              {/if}
              {#if column.showParent(columnLevel)}
                <th colspan={column.getColSpan(columnLevel)}>{column.getParentName(columnLevel)}</th>
              {/if}
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
            {#if row.incompleteRowsIndicator}
              <td colspan={display.columns.length}
                ><PerspectiveIntersectionObserver
                  rootNode={domWrapper}
                  onLoadNext={() => {
                    dbg('load next', row.incompleteRowsIndicator);
                    loadedCounts.update(counts => {
                      const res = { ...counts };
                      for (const id of row.incompleteRowsIndicator) {
                        res[id] = (res[id] || 100) + 100;
                      }
                      return res;
                    });
                  }}
                /></td
              >
            {:else}
              {#each display.columns as column}
                <!-- <td>{row.rowSpans[column.columnIndex]} {row.rowData[column.columnIndex]}</td> -->
                {#if row.rowData[column.columnIndex] !== undefined}
                  <td rowspan={row.rowSpans[column.columnIndex]}>{row.rowData[column.columnIndex]}</td>
                {/if}
              {/each}
            {/if}
          </tr>
        {/each}
      </tbody>
    </table>
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

  th {
    /* border: 1px solid var(--theme-border); */
    text-align: left;
    padding: 2px;
    margin: 0;
    background-color: var(--theme-bg-1);
    overflow: hidden;
    vertical-align: center;
    z-index: 100;

    border-bottom: 1px solid var(--theme-border);
    border-right: 1px solid var(--theme-border);
  }

  th.filter {
    padding: 0;
  }

  thead tr:first-child th {
    border-top: 1px solid var(--theme-border);
  }

  td {
    font-weight: normal;
    /* border: 1px solid var(--theme-border); */
    background-color: var(--theme-bg-0);
    padding: 2px;
    position: relative;
    overflow: hidden;
    vertical-align: top;
    border-bottom: 1px solid var(--theme-border);
    border-right: 1px solid var(--theme-border);
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
</style>
