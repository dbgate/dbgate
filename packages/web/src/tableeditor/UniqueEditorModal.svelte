<script lang="ts">
  import ColumnsConstraintEditorModal from './ColumnsConstraintEditorModal.svelte';
  import { _t } from '../translations';

  export let constraintInfo;
  export let setTableInfo;
  export let tableInfo;

</script>

<ColumnsConstraintEditorModal
  {...$$restProps}
  constraintLabel={_t('tableEdit.unique', { defaultMessage: "unique" })}
  constraintType="unique"
  {constraintInfo}
  {setTableInfo}
  {tableInfo}
/>
