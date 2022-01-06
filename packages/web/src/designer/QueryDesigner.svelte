<script lang="ts">
  import Designer from './Designer.svelte';
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
    showJoinType: true,
    showReferenceArrow: false,
    allowScrollColumns: true,
    allowAddAllReferences: false,
  }}
/>
