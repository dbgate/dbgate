<script lang="ts">
  import ColumnsConstraintEditorModal from './ColumnsConstraintEditorModal.svelte';

  export let constraintInfo;
  export let setTableInfo;
  export let tableInfo;

</script>

<ColumnsConstraintEditorModal
  {...$$restProps}
  constraintLabel="primary key"
  constraintType="primaryKey"
  {constraintInfo}
  {setTableInfo}
  {tableInfo}
/>
