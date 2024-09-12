<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import uuidv1 from 'uuid/v1';

  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import ModalBase from '../modals/ModalBase.svelte';
  import { closeCurrentModal } from '../modals/modalTools';
  import { editorAddConstraint, editorDeleteConstraint, editorModifyConstraint } from 'dbgate-tools';
  import TextField from '../forms/TextField.svelte';
  import SelectField from '../forms/SelectField.svelte';

  export let constraintInfo;
  export let setTableInfo;
  export let tableInfo;
  export let constraintLabel;
  export let constraintType;
  export let constraintNameLabel = 'Constraint name';
  export let getExtractConstraintProps;
  export let hideConstraintName = false;

  let constraintName = constraintInfo?.constraintName;
  let columns = constraintInfo?.columns || [];

  function getConstraint() {
    return {
      pairingId: uuidv1(),
      ...constraintInfo,
      columns,
      pureName: tableInfo.pureName,
      schemaName: tableInfo.schemaName,
      constraintName,
      constraintType,
      ...(getExtractConstraintProps ? getExtractConstraintProps() : {}),
    };
  }

  $: isReadOnly = !setTableInfo;
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header"
      >{constraintInfo ? `Edit ${constraintLabel}` : `Add ${constraintLabel}`}</svelte:fragment
    >

    <div class="largeFormMarker">
      {#if !hideConstraintName}
        <div class="row">
          <div class="label col-3">{constraintNameLabel}</div>
          <div class="col-9">
            <TextField
              value={constraintName}
              on:input={e => (constraintName = e.target['value'])}
              focused
              disabled={isReadOnly}
            />
          </div>
        </div>
      {/if}

      {#if $$slots.constraintProps}
        <slot name="constraintProps" />
      {/if}

      {#each columns as column, index}
        <div class="row">
          <div class="label col-3">Column {index + 1}</div>
          <div class={$$slots.column ? 'col-3' : 'col-6'}>
            {#key column.columnName}
              <SelectField
                value={column.columnName}
                isNative
                disabled={isReadOnly}
                options={tableInfo.columns.map(col => ({
                  label: col.columnName,
                  value: col.columnName,
                }))}
                on:change={e => {
                  if (e.detail) {
                    columns = columns.map((col, i) => (i == index ? { columnName: e.detail } : col));
                  }
                }}
              />
            {/key}
          </div>
          {#if $$slots.column}
            <div class="col-3">
              <slot name="column" {column} setColumns={changeFunc => (columns = changeFunc(columns))} {index} />
            </div>
          {/if}
          <div class="col-3 button">
            <FormStyledButton
              value="Delete"
              disabled={isReadOnly}
              on:click={e => {
                const x = [...columns];
                x.splice(index, 1);
                columns = x;
              }}
            />
          </div>
        </div>
      {/each}

      <div class="row">
        <div class="label col-3">Add new column</div>
        <div class="col-9">
          {#key columns.length}
            <SelectField
              placeholder="Select column"
              disabled={isReadOnly}
              value={''}
              on:change={e => {
                if (e.detail)
                  columns = [
                    ...columns,
                    {
                      columnName: e.detail,
                    },
                  ];
              }}
              isNative
              options={[
                {
                  label: 'Choose column',
                  value: '',
                },
                ...(tableInfo?.columns?.map(col => ({
                  label: col.columnName,
                  value: col.columnName,
                })) || []),
              ]}
            />
          {/key}
        </div>
      </div>
    </div>

    <svelte:fragment slot="footer">
      <FormSubmit
        value={'Save'}
        disabled={isReadOnly}
        on:click={() => {
          closeCurrentModal();
          if (constraintInfo) {
            setTableInfo(tbl => editorModifyConstraint(tbl, getConstraint()));
          } else {
            setTableInfo(tbl => editorAddConstraint(tbl, getConstraint()));
          }
        }}
      />

      <FormStyledButton type="button" value="Close" on:click={closeCurrentModal} />
      {#if constraintInfo}
        <FormStyledButton
          type="button"
          value="Remove"
          disabled={isReadOnly}
          on:click={() => {
            closeCurrentModal();
            setTableInfo(tbl => editorDeleteConstraint(tbl, constraintInfo));
          }}
        />
      {/if}
    </svelte:fragment>
  </ModalBase>
</FormProvider>

<style>
  .row {
    margin: var(--dim-large-form-margin);
    display: flex;
  }

  .row .label {
    white-space: nowrap;
    align-self: center;
  }

  .button {
    align-self: center;
    text-align: right;
  }
</style>
