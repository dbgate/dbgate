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
    canArrange: true,
    canExport: true,
    canSelectColumns: false,
    canSelectTables: true,
    allowChangeColor: true,
    appendTableSystemMenu: true,
    customizeStyle: true,
    allowDefineVirtualReferences: true,
    canCheckTables: true,
    arrangeAlg: 'springy',
  }}
  referenceComponent={DiagramDesignerReference}
/>
