<script lang="ts">
  import PerspectiveNodeRow from './PerspectiveNodeRow.svelte';

  export let nodes = [];

  function processFlatColumns(res, columns) {
    for (const col of columns) {
      res.push(col);
      if (col.isExpanded) {
        processFlatColumns(res, col.childNodes);
      }
    }
  }

  function getFlatColumns(columns) {
    const res = [];
    processFlatColumns(res, columns);
    return res;
  }
</script>

{#each getFlatColumns(nodes) as node}
  <PerspectiveNodeRow {node} />
{/each}
