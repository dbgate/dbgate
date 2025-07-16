<script lang="ts">
  import Designer from './Designer.svelte';
  import DiagramDesignerReference from './DiagramDesignerReference.svelte';
  // import QueryDesignerReference from './QueryDesignerReference.svelte';

  export let columnFilter;
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
  showColumnFilter={false}
  {columnFilter}
  allowAddTablesButton
/>
