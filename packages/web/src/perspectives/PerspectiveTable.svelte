<script lang="ts">
  import {
    // groupPerspectiveLoadProps,
    PerspectiveDataLoadProps,
    PerspectiveDataLoadPropsWithNode,
    PerspectiveTreeNode,
  } from 'dbgate-datalib';
  import _ from 'lodash';
  import { onMount } from 'svelte';
  import { prop_dev } from 'svelte/internal';

  export let root: PerspectiveTreeNode;

  async function loadLevelData(node: PerspectiveTreeNode, parentRows: any[]) {
    // const loadProps: PerspectiveDataLoadPropsWithNode[] = [];
    const loadChildNodes = [];
    const loadChildRows = [];
    const loadProps = node.getNodeLoadProps(parentRows);
    console.log('LOADER', loadProps.pureName);
    const rows = await node.loader(loadProps);
    // console.log('ROWS', rows, node.isRoot);

    if (node.isRoot) {
      parentRows.push(...rows);
      // console.log('PUSH PARENTROWS', parentRows);
    } else {
      for (const parentRow of parentRows) {
        const childRows = rows.filter(row => node.matchChildRow(parentRow, row));
        parentRow[node.codeName] = childRows;
      }
    }

    for (const child of node.childNodes) {
      if (child.isExpandable && child.isChecked) {
        loadLevelData(child, rows);
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
    console.log('RESULT', rows);
    // const rows = await node.loadLevelData();
    // for (const child of node.childNodes) {
    //   const loadProps = [];
    //   if (child.isExpandable && child.isChecked) {
    //     loadProps.push(child.getNodeLoadProps());
    //   }
    // }
  }

  $: loadData(root);
</script>

<table>
  <tr><td>xxx</td></tr>
</table>
