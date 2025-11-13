<script lang="ts">
  import ColumnsConstraintEditorModal from './ColumnsConstraintEditorModal.svelte';
  import { _t } from '../translations';

  export let constraintInfo;
  export let setTableInfo;
  export let tableInfo;
  export let driver;

  export let constraintLabel = _t('tableEditor.primaryKey', { defaultMessage: 'primary key' });
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
