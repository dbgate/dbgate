<script lang="ts">
  import CheckboxField from '../forms/CheckboxField.svelte';
  import FormCheckboxField from '../forms/FormCheckboxField.svelte';
  import SelectField from '../forms/SelectField.svelte';
  import TextField from '../forms/TextField.svelte';

  import ColumnsConstraintEditorModal from './ColumnsConstraintEditorModal.svelte';

  export let constraintInfo;
  export let setTableInfo;
  export let tableInfo;
  export let driver;

  let isUnique = constraintInfo?.isUnique;

  function getExtractConstraintProps() {
    return {
      isUnique,
      filterDefinition,
    };
  }

  let filterDefinition = constraintInfo?.filterDefinition;

  $: isReadOnly = !setTableInfo;
</script>

<ColumnsConstraintEditorModal
  {...$$restProps}
  constraintLabel="index"
  constraintType="index"
  constraintNameLabel="Index name"
  {constraintInfo}
  {setTableInfo}
  {tableInfo}
  {getExtractConstraintProps}
>
  <svelte:fragment slot="column" let:column let:setColumns let:index>
    <SelectField
      value={column.isDescending ? 'desc' : 'asc'}
      isNative
      disabled={isReadOnly}
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
  <svelte:fragment slot="constraintProps">
    <div class="largeFormMarker">
      <div class="row">
        <CheckboxField checked={isUnique} on:change={e => (isUnique = e.target.checked)} disabled={isReadOnly} /> Is unique
        index
      </div>
    </div>

    <div class="largeFormMarker">
      {#if driver?.dialect?.filteredIndexes}
        <div class="row">
          <div class="label col-3">Filtered index condition</div>
          <div class="col-9">
            <TextField
              value={filterDefinition}
              on:input={e => (filterDefinition = e.target['value'])}
              focused
              disabled={isReadOnly}
            />
          </div>
        </div>
      {/if}
    </div>
  </svelte:fragment>
</ColumnsConstraintEditorModal>

<style>
  .row {
    margin: var(--dim-large-form-margin);
    display: flex;
  }
</style>
