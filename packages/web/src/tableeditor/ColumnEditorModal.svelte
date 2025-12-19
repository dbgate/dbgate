<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';

  import FormTextField from '../forms/FormTextField.svelte';
  import FormCheckboxField from '../forms/FormCheckboxField.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FormButton from '../forms/FormButton.svelte';
  import ModalBase from '../modals/ModalBase.svelte';
  import { closeCurrentModal } from '../modals/modalTools';
  import DataTypeEditor from './DataTypeEditor.svelte';
  import { editorAddColumn, editorDeleteColumn, editorModifyColumn, fillEditorColumnInfo } from 'dbgate-tools';
  import { _t } from '../translations';

  export let columnInfo;
  export let setTableInfo = null;
  export let tableInfo = null;
  export let onAddNext;
  export let driver = null;

  export let addDataCommand = false;

  $: isReadOnly = !setTableInfo;
</script>

<FormProvider initialValues={fillEditorColumnInfo(columnInfo || {}, tableInfo)}>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header"
      >{columnInfo ? _t('columnEditor.editColumn', { defaultMessage: 'Edit column' }) : _t('columnEditor.addColumn', { defaultMessage: 'Add column {columnNumber}', values: { columnNumber: (tableInfo?.columns || []).length + 1 } })}</svelte:fragment
    >

    <FormTextField name="columnName" label={_t('columnEditor.columnName', { defaultMessage: 'Column name' })} focused disabled={isReadOnly} />
    <DataTypeEditor dialect={driver?.dialect} disabled={isReadOnly} />

    {#if !driver?.dialect?.specificNullabilityImplementation}
      <FormCheckboxField name="notNull" label="NOT NULL" disabled={isReadOnly} />
    {/if}
    <FormCheckboxField name="isPrimaryKey" label={_t('columnEditor.isPrimaryKey', { defaultMessage: 'Is Primary Key' })} disabled={isReadOnly} />
    {#if !driver?.dialect?.disableAutoIncrement}
      <FormCheckboxField name="autoIncrement" label={_t('columnEditor.autoIncrement', { defaultMessage: 'Is Autoincrement' })} disabled={isReadOnly} />
    {/if}
    <FormTextField
      name="defaultValue"
      label={_t('columnEditor.defaultValue', { defaultMessage: "Default value. Please use valid SQL expression, eg. 'Hello World' for string value, '' for empty string" })}
      disabled={!setTableInfo}
    />
    <FormTextField name="computedExpression" label={_t('columnEditor.computedExpression', { defaultMessage: 'Computed expression' })} disabled={isReadOnly} />
    {#if driver?.dialect?.columnProperties?.isUnsigned}
      <FormCheckboxField name="isUnsigned" label={_t('columnEditor.isUnsigned', { defaultMessage: 'Unsigned' })} disabled={isReadOnly} />
    {/if}
    {#if driver?.dialect?.columnProperties?.isZerofill}
      <FormCheckboxField name="isZerofill" label={_t('columnEditor.isZerofill', { defaultMessage: 'Zero fill' })} disabled={isReadOnly} />
    {/if}
    {#if driver?.dialect?.columnProperties?.columnComment}
      <FormTextField name="columnComment" label={_t('columnEditor.columnComment', { defaultMessage: 'Comment' })} disabled={isReadOnly} />
    {/if}
    {#if driver?.dialect?.columnProperties?.isSparse}
      <FormCheckboxField name="isSparse" label={_t('columnEditor.isSparse', { defaultMessage: 'Sparse' })} disabled={isReadOnly} />
    {/if}

    <svelte:fragment slot="footer">
      <FormSubmit
        value={columnInfo ? _t('common.save', { defaultMessage: 'Save' }) : _t('common.saveAndNext', { defaultMessage: 'Save and next' })}
        disabled={isReadOnly}
        on:click={e => {
          closeCurrentModal();
          if (columnInfo) {
            setTableInfo(tbl => editorModifyColumn(tbl, e.detail, addDataCommand));
          } else {
            setTableInfo(tbl => editorAddColumn(tbl, e.detail, addDataCommand));
            if (onAddNext) onAddNext();
          }
        }}
      />
      {#if !columnInfo}
        <FormButton
          type="button"
          value={_t('common.save', { defaultMessage: 'Save' })}
          disabled={isReadOnly}
          on:click={e => {
            closeCurrentModal();
            setTableInfo(tbl => editorAddColumn(tbl, e.detail, addDataCommand));
          }}
        />
      {/if}

      <FormStyledButton type="button" value={_t('common.close', { defaultMessage: 'Close' })} on:click={closeCurrentModal} />
      {#if columnInfo}
        <FormStyledButton
          type="button"
          value={_t('common.remove', { defaultMessage: 'Remove' })}
          on:click={() => {
            closeCurrentModal();
            setTableInfo(tbl => editorDeleteColumn(tbl, columnInfo, addDataCommand));
          }}
        />
      {/if}
    </svelte:fragment>
  </ModalBase>
</FormProvider>
