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
    updateFromDbInfo: false,
    useDatabaseReferences: false,
    allowScrollColumns: true,
    allowAddAllReferences: false,
    canArrange: false,
    canExport: false,
    canSelectColumns: true,
    canSelectTables: false,
    allowChangeColor: false,
  }}
  referenceComponent={QueryDesignerReference}
/>
