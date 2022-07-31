<script lang="ts">
  import { ChangeConfigFunc, ChangePerspectiveConfigFunc, GridConfig, PerspectiveConfig } from 'dbgate-datalib';

  import PerspectiveNodeRow from './PerspectiveNodeRow.svelte';

  export let root;
  export let config: PerspectiveConfig;
  export let setConfig: ChangePerspectiveConfigFunc;
  export let conid;
  export let database;

  function processFlatColumns(res, columns) {
    for (const col of columns) {
      res.push(col);
      if (col.isExpanded) {
        processFlatColumns(res, col.childNodes);
      }
    }
  }

  function getFlatColumns(root) {
    const res = [];
    processFlatColumns(res, root?.childNodes || []);
    return res;
  }
</script>

{#each getFlatColumns(root) as node}
  <PerspectiveNodeRow {node} {config} {setConfig} {root} {conid} {database} />
{/each}
