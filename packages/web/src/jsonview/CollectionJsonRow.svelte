<script lang="ts">
  import JSONTree from '../jsontree/JSONTree.svelte';

  export let rowIndex;
  export let grider;
  export let commonMenu;

  $: rowData = grider.getRowData(rowIndex);
  $: rowStatus = grider.getRowStatus(rowIndex);
</script>

<JSONTree
  value={rowData}
  labelOverride="({rowIndex + 1}) "
  menu={commonMenu}
  isModified={rowStatus.status == 'updated'}
  isInserted={rowStatus.status == 'inserted'}
  isDeleted={rowStatus.status == 'deleted'}
/>
