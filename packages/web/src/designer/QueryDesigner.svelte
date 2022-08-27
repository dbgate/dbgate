<script lang="ts">
  import Designer from './Designer.svelte';
  import QueryDesignerReference from './QueryDesignerReference.svelte';
</script>

<Designer
  {...$$props}
  settings={{
    showTableCloseButton: true,
    allowColumnOperations: true,
    allowCreateRefByDrag: true,
    allowTableAlias: true,
    allowScrollColumns: true,
    canSelectColumns: true,
  }}
  referenceComponent={QueryDesignerReference}
/>
