<script lang="ts">
  import uuidv1 from 'uuid/v1';
  import FormStyledButton from '../elements/FormStyledButton.svelte';

  import FormSelectField from '../forms/FormSelectField.svelte';
  import FormTextField from '../forms/FormTextField.svelte';
  import FormCheckboxField from '../forms/FormCheckboxField.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import ModalBase from '../modals/ModalBase.svelte';
  import { closeCurrentModal } from '../modals/modalTools';
  import ElectronFilesInput from '../impexp/ElectronFilesInput.svelte';

  export let columnInfo;
  export let setTableInfo;

</script>

<FormProvider initialValues={columnInfo}>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header">{columnInfo ? 'Edit column' : 'Add new column'}</svelte:fragment>

    <FormTextField name="columnName" label="Column name" />
    <FormTextField name="dataType" label="Data type" />
    <FormCheckboxField name="notNull" label="NOT NULL" />
    <!-- <FormCheckboxField name="isPrimaryKey" label="Is Primary Key" />  -->
    <FormCheckboxField name="autoIncrement" label="Is Autoincrement" />
    <FormTextField name="defaultValue" label="Default value" />
    <FormTextField name="computedExpression" label="Computed expression" />

    <svelte:fragment slot="footer">
      <FormSubmit
        value="OK"
        on:click={e => {
          closeCurrentModal();
          if (columnInfo) {
            setTableInfo(tbl => ({
              ...tbl,
              columns: tbl.columns.map(col => (col.groupId == columnInfo.groupId ? e.detail : col)),
            }));
          } else {
            setTableInfo(tbl => ({
              ...tbl,
              columns: [...tbl.columns, { ...e.detail, groupId: uuidv1() }],
            }));
          }
          // onConfirm();
        }}
      />
      <FormStyledButton type="button" value="Close" on:click={closeCurrentModal} />
      {#if columnInfo}
        <FormStyledButton
          type="button"
          value="Remove"
          on:click={() => {
            closeCurrentModal();
            setTableInfo(tbl => ({
              ...tbl,
              columns: tbl.columns.filter(col => col.groupId != columnInfo.groupId),
            }));
          }}
        />
      {/if}
    </svelte:fragment>
  </ModalBase>
</FormProvider>
