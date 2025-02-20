<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import uuidv1 from 'uuid/v1';

  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import ModalBase from '../modals/ModalBase.svelte';
  import { closeCurrentModal } from '../modals/modalTools';
  import {
    editorAddConstraint,
    editorDeleteConstraint,
    editorModifyConstraint,
    fullNameFromString,
    fullNameToLabel,
    fullNameToString,
  } from 'dbgate-tools';
  import TextField from '../forms/TextField.svelte';
  import SelectField from '../forms/SelectField.svelte';
  import _ from 'lodash';
  import { _t } from '../translations';

  export let constraintInfo;
  export let setTableInfo;
  export let tableInfo;
  export let dbInfo;

  const foreignKeyActions = ['noAction', 'cascade', 'restrict', 'setNull'];
  const foreignKeyActionsOptions = foreignKeyActions.map(x => ({
    label: _.startCase(x),
    value: x,
  }));

  let constraintName = constraintInfo?.constraintName;
  let columns = constraintInfo?.columns || [];
  let refTableName = constraintInfo?.refTableName;
  let refSchemaName = constraintInfo?.refSchemaName;
  let deleteAction = constraintInfo?.deleteAction ? _.camelCase(constraintInfo?.deleteAction) : null;
  let updateAction = constraintInfo?.updateAction ? _.camelCase(constraintInfo?.updateAction) : null;

  $: refTableInfo = dbInfo?.tables?.find(x => x.pureName == refTableName && x.schemaName == refSchemaName);

  function getConstraint() {
    return {
      pairingId: uuidv1(),
      ...constraintInfo,
      columns,
      pureName: tableInfo.pureName,
      schemaName: tableInfo.schemaName,
      constraintName,
      constraintType: 'foreignKey',
      refTableName,
      refSchemaName,
      deleteAction: _.startCase(deleteAction).toUpperCase(),
      updateAction: _.startCase(updateAction).toUpperCase(),
    };
  }

  $: isReadOnly = !setTableInfo;
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header">{constraintInfo ? `Edit foreign key` : `Add foreign key`}</svelte:fragment>

    <div class="largeFormMarker">
      <div class="row">
        <div class="label col-3">Constraint name</div>
        <div class="col-9">
          <TextField
            value={constraintName}
            on:input={e => (constraintName = e.target['value'])}
            focused
            disabled={isReadOnly}
          />
        </div>
      </div>

      <div class="row">
        <div class="label col-3">Referenced table</div>
        <div class="col-9">
          <SelectField
            value={fullNameToString({ pureName: refTableName, schemaName: refSchemaName })}
            isNative
            notSelected
            options={_.sortBy(dbInfo?.tables || [], ['schemaName', 'pureName']).map(tbl => ({
              label: fullNameToLabel(tbl),
              value: fullNameToString(tbl),
            }))}
            disabled={isReadOnly}
            on:change={e => {
              if (e.detail) {
                const name = fullNameFromString(e.detail);
                refTableName = name.pureName;
                refSchemaName = name.schemaName;
              }
            }}
          />
        </div>
      </div>

      <div class="row">
        <div class="label col-3">On update action</div>
        <div class="col-9">
          <SelectField
            value={updateAction}
            isNative
            notSelected
            options={foreignKeyActionsOptions}
            disabled={isReadOnly}
            on:change={e => {
              updateAction = e.detail || null;
            }}
          />
        </div>
      </div>

      <div class="row">
        <div class="label col-3">On delete action</div>
        <div class="col-9">
          <SelectField
            value={deleteAction}
            isNative
            notSelected
            options={foreignKeyActionsOptions}
            disabled={isReadOnly}
            on:change={e => {
              deleteAction = e.detail || null;
            }}
          />
        </div>
      </div>

      <div class="row">
        <div class="col-5 mr-1">
          Base column - {tableInfo.pureName}
        </div>
        <div class="col-5 ml-1">
          Ref column - {refTableName || '(table not set)'}
        </div>
      </div>

      {#each columns as column, index}
        <div class="row">
          <div class="col-5 mr-1">
            {#key column.columnName}
              <SelectField
                value={column.columnName}
                isNative
                notSelected
                disabled={isReadOnly}
                options={tableInfo.columns.map(col => ({
                  label: col.columnName,
                  value: col.columnName,
                }))}
                on:change={e => {
                  if (e.detail) {
                    columns = columns.map((col, i) => (i == index ? { ...col, columnName: e.detail } : col));
                  }
                }}
              />
            {/key}
          </div>
          <div class="col-5 ml-1">
            {#key column.refColumnName}
              <SelectField
                value={column.refColumnName}
                isNative
                notSelected
                disabled={isReadOnly}
                options={(refTableInfo?.columns || []).map(col => ({
                  label: col.columnName,
                  value: col.columnName,
                }))}
                on:change={e => {
                  if (e.detail) {
                    columns = columns.map((col, i) => (i == index ? { ...col, refColumnName: e.detail } : col));
                  }
                }}
              />
            {/key}
          </div>
          <div class="col-2 button">
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

      <FormStyledButton
        type="button"
        value="Add column"
        disabled={isReadOnly}
        on:click={() => {
          columns = [...columns, {}];
        }}
      />
    </div>

    <svelte:fragment slot="footer">
      <FormSubmit
        value={_t('common.save', { defaultMessage: 'Save' })}
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
          disabled={isReadOnly}
          value="Remove"
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
