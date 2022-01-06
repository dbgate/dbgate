<script lang="ts">
  import Designer from './Designer.svelte';
  import DiagramDesignerReference from './DiagramDesignerReference.svelte';
</script>

<Designer
  {...$$props}
  settings={{
    showTableCloseButton: false,
    allowColumnOperations: false,
    allowCreateRefByDrag: false,
    allowTableAlias: false,
    updateFromDbInfo: true,
    useDatabaseReferences: true,
    allowScrollColumns: false,
    allowAddAllReferences: true,
  }}
  referenceComponent={DiagramDesignerReference}
/>
