<script lang="ts">
  import ColumnsConstraintEditorModal from './ColumnsConstraintEditorModal.svelte';

  export let constraintInfo;
  export let setTableInfo;
  export let tableInfo;
  export let driver;

  export let constraintLabel = 'primary key';
  export let constraintType = 'primaryKey';
</script>

<ColumnsConstraintEditorModal
  {...$$restProps}
  {constraintLabel}
  {constraintType}
  {constraintInfo}
  {setTableInfo}
  {tableInfo}
  hideConstraintName={driver?.dialect?.anonymousPrimaryKey}
/>
