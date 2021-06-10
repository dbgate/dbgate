<script lang="ts">
  import FormStyledButton from '../elements/FormStyledButton.svelte';

  import FormSelectField from '../forms/FormSelectField.svelte';
  import FormTextField from '../forms/FormTextField.svelte';
  import FormCheckboxField from '../forms/FormCheckboxField.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import ModalBase from '../modals/ModalBase.svelte';
  import { closeCurrentModal } from '../modals/modalTools';

  export let columnInfo;

</script>

<FormProvider>
  <ModalBase {...$$restProps}>
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
        on:click={() => {
          closeCurrentModal();
          // onConfirm();
        }}
      />
      <FormStyledButton type="button" value="Close" on:click={closeCurrentModal} />
    </svelte:fragment>
  </ModalBase>
</FormProvider>
