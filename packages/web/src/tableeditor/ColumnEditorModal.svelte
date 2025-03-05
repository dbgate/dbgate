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
      >{columnInfo ? 'Edit column' : `Add column ${(tableInfo?.columns || []).length + 1}`}</svelte:fragment
    >

    <FormTextField name="columnName" label="Column name" focused disabled={isReadOnly} />
    <DataTypeEditor dialect={driver?.dialect} disabled={isReadOnly} />

    {#if !driver?.dialect?.specificNullabilityImplementation}
      <FormCheckboxField name="notNull" label="NOT NULL" disabled={isReadOnly} />
    {/if}
    <FormCheckboxField name="isPrimaryKey" label="Is Primary Key" disabled={isReadOnly} />
    {#if !driver?.dialect?.disableAutoIncrement}
      <FormCheckboxField name="autoIncrement" label="Is Autoincrement" disabled={isReadOnly} />
    {/if}
    <FormTextField
      name="defaultValue"
      label="Default value. Please use valid SQL expression, eg. 'Hello World' for string value, '' for empty string"
      disabled={!setTableInfo}
    />
    <FormTextField name="computedExpression" label="Computed expression" disabled={isReadOnly} />
    {#if driver?.dialect?.columnProperties?.isUnsigned}
      <FormCheckboxField name="isUnsigned" label="Unsigned" disabled={isReadOnly} />
    {/if}
    {#if driver?.dialect?.columnProperties?.isZerofill}
      <FormCheckboxField name="isZerofill" label="Zero fill" disabled={isReadOnly} />
    {/if}
    {#if driver?.dialect?.columnProperties?.columnComment}
      <FormTextField name="columnComment" label="Comment" disabled={isReadOnly} />
    {/if}
    {#if driver?.dialect?.columnProperties?.isSparse}
      <FormCheckboxField name="isSparse" label="Sparse" disabled={isReadOnly} />
    {/if}

    <svelte:fragment slot="footer">
      <FormSubmit
        value={columnInfo ? 'Save' : 'Save and next'}
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

      <FormStyledButton type="button" value="Close" on:click={closeCurrentModal} />
      {#if columnInfo}
        <FormStyledButton
          type="button"
          value="Remove"
          on:click={() => {
            closeCurrentModal();
            setTableInfo(tbl => editorDeleteColumn(tbl, columnInfo, addDataCommand));
          }}
        />
      {/if}
    </svelte:fragment>
  </ModalBase>
</FormProvider>
