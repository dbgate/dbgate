<script lang="ts">
  import Designer from './Designer.svelte';
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
    showJoinType: false,
    showReferenceArrow: true,
    allowScrollColumns: false,
    allowAddAllReferences: true,
  }}
/>
