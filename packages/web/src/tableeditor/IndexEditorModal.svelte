<script lang="ts">
  import SelectField from '../forms/SelectField.svelte';

  import ColumnsConstraintEditorModal from './ColumnsConstraintEditorModal.svelte';

  export let constraintInfo;
  export let setTableInfo;
  export let tableInfo;
</script>

<ColumnsConstraintEditorModal
  {...$$restProps}
  constraintLabel="index"
  constraintType="index"
  {constraintInfo}
  {setTableInfo}
  {tableInfo}
>
  <svelte:fragment slot="column" let:column let:setColumns let:index>
    <SelectField
      value={column.isDescending ? 'desc' : 'asc'}
      isNative
      options={[
        { label: 'ASC', value: 'asc' },
        { label: 'DESC', value: 'desc' },
      ]}
      on:change={e => {
        setColumns(columns =>
          columns.map((col, i) =>
            i == index
              ? {
                  ...col,
                  isDescending: e.detail == 'desc',
                }
              : col
          )
        );
      }}
    />
  </svelte:fragment>
</ColumnsConstraintEditorModal>
