<script lang="ts">
  import PerspectiveNodeRow from './PerspectiveNodeRow.svelte';

  export let root;

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
  <PerspectiveNodeRow {node} />
{/each}
