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
  import { prop_dev } from 'svelte/internal';

  export let root: PerspectiveTreeNode;
  let dataRows;

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

    console.log('DISPLAY ROWS', rows);
    // const rows = await node.loadLevelData();
    // for (const child of node.childNodes) {
    //   const loadProps = [];
    //   if (child.isExpandable && child.isChecked) {
    //     loadProps.push(child.getNodeLoadProps());
    //   }
    // }
  }

  $: loadData(root);
  $: display = root && dataRows ? new PerspectiveDisplay(root, dataRows) : null;
</script>

<div class="wrapper">
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
  }

  table {
    border: 1px solid;
    border-collapse: collapse;
  }

  td,
  th {
    border: 1px solid;
  }
</style>
