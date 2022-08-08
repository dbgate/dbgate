<script lang="ts">
  import {
    ChangeConfigFunc,
    ChangePerspectiveConfigFunc,
    GridConfig,
    PerspectiveConfig,
    PerspectiveTreeNode,
  } from 'dbgate-datalib';
  import { filterName } from 'dbgate-tools';

  import PerspectiveNodeRow from './PerspectiveNodeRow.svelte';

  export let root;
  export let config: PerspectiveConfig;
  export let setConfig: ChangePerspectiveConfigFunc;
  export let conid;
  export let database;
  export let filter;

  function getFlatColumns(node: PerspectiveTreeNode, filter: string) {
    const res = [];
    for (const col of node?.childNodes) {
      if (filterName(filter, col.title)) {
        res.push(col);
        if (col.isExpanded) {
          res.push(...getFlatColumns(col, filter));
        }
      } else if (col.isExpanded) {
        const children = getFlatColumns(col, filter);
        if (children.length > 0) {
          res.push(col);
          res.push(...children);
        }
      }
    }
    return res;
  }
</script>

{#each getFlatColumns(root, filter) as node}
  <PerspectiveNodeRow {node} {config} {setConfig} {root} {conid} {database} />
{/each}
