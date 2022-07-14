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

  export let root: PerspectiveTreeNode;
  let dataRows;
  let domWrapper;
  let domTableHead;
  let domHeaderWrap;
  let theadClone;

  async function loadLevelData(node: PerspectiveTreeNode, parentRows: any[]) {
    // const loadProps: PerspectiveDataLoadPropsWithNode[] = [];
    const loadChildNodes = [];
    const loadChildRows = [];
    const loadProps = node.getNodeLoadProps(parentRows);
    const rows = await node.loader(loadProps);
    // console.log('ROWS', rows, node.isRoot);

    if (node.isRoot) {
      parentRows.push(...rows);
      // console.log('PUSH PARENTROWS', parentRows);
    } else {
      for (const parentRow of parentRows) {
        const childRows = rows.filter(row => node.matchChildRow(parentRow, row));
        parentRow[node.fieldName] = childRows;
      }
    }

    for (const child of node.childNodes) {
      if (child.isExpandable && child.isChecked) {
        await loadLevelData(child, rows);
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

  async function loadData(node: PerspectiveTreeNode) {
    // console.log('LOADING', node);
    if (!node) return;
    const rows = [];
    await loadLevelData(node, rows);
    dataRows = rows;

    // console.log('DISPLAY ROWS', rows);
    // const rows = await node.loadLevelData();
    // for (const child of node.childNodes) {
    //   const loadProps = [];
    //   if (child.isExpandable && child.isChecked) {
    //     loadProps.push(child.getNodeLoadProps());
    //   }
    // }
  }

  async function createHeaderClone() {
    if (!domTableHead || !domHeaderWrap) return;
    await tick();

    if (theadClone) {
      theadClone.remove();
      theadClone = null;
    }
    theadClone = domTableHead.cloneNode(true);
    const sourceCells = domTableHead.querySelectorAll('th');
    const targetCells = theadClone.querySelectorAll('th');
    domHeaderWrap.appendChild(theadClone);
    for (const pair of _.zip(sourceCells, targetCells)) {
      const [src, dst]: [any, any] = pair;
      dst.style.width = `${src.getBoundingClientRect().width - 1}px`;
      dst.style.minWidth = `${src.getBoundingClientRect().width - 1}px`;
      dst.style.maxWidth = `${src.getBoundingClientRect().width - 1}px`;
    }
  }

  $: loadData(root);
  $: display = root && dataRows ? new PerspectiveDisplay(root, dataRows) : null;

  $: {
    display;
    domTableHead;
    domHeaderWrap;
    createHeaderClone();
  }
</script>

<div class="headerWrap">
  <table bind:this={domHeaderWrap} />
</div>

<div class="wrapper" bind:this={domWrapper} use:resizeObserver={true} on:resize={createHeaderClone}>
  {#if display}
    <table>
      <thead bind:this={domTableHead}>
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
      </thead>
      <tbody>
        {#each display.rows as row}
          <tr>
            {#each display.columns as column}
              <!-- <td>{row.rowSpans[column.columnIndex]} {row.rowData[column.columnIndex]}</td> -->
              {#if row.rowData[column.columnIndex] !== undefined}
                <td rowspan={row.rowSpans[column.columnIndex]}>{row.rowData[column.columnIndex]}</td>
              {/if}
            {/each}
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

  .headerWrap {
    position: absolute;
    left: 0;
    top: 0;
    right: 14px;
    overflow: hidden;
    z-index: 100;
  }

  table {
    /* position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    right: 0; */
    overflow: scroll;
    border-collapse: collapse;
    outline: none;
  }
  th {
    border: 1px solid var(--theme-border);
    text-align: left;
    padding: 2px;
    margin: 0;
    background-color: var(--theme-bg-1);
    overflow: hidden;
    vertical-align: center;
  }

  td {
    font-weight: normal;
    border: 1px solid var(--theme-border);
    background-color: var(--theme-bg-0);
    padding: 2px;
    position: relative;
    overflow: hidden;
    vertical-align: top;
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
