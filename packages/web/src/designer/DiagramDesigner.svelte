<script lang="ts">
  import Designer from './Designer.svelte';
  import DiagramDesignerReference from './DiagramDesignerReference.svelte';
</script>

<Designer
  {...$$props}
  settings={{
    updateFromDbInfo: true,
    useDatabaseReferences: true,
    allowAddAllReferences: true,
    canExport: true,
    canSelectTables: true,
    allowChangeColor: true,
    appendTableSystemMenu: true,
    customizeStyle: true,
    allowDefineVirtualReferences: true,
    arrangeAlg: 'springy',
  }}
  referenceComponent={DiagramDesignerReference}
/>
