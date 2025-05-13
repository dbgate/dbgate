<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FormTextField from '../forms/FormTextField.svelte';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let value;
  export let onConfirm;

  const handleSubmit = async value => {
    closeCurrentModal();
    onConfirm(value);
  };
</script>

<FormProvider initialValues={{ value }}>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header">Rows limit</svelte:fragment>

    <FormTextField
      label="Return only N rows from query"
      name="value"
      focused
      data-testid="RowsLimitModal_value"
      placeholder="(No rows limit)"
    />

    <svelte:fragment slot="footer">
      <FormSubmit
        value="OK"
        on:click={e => handleSubmit(parseInt(e.detail.value) || null)}
        data-testid="RowsLimitModal_setLimit"
      />
      <FormStyledButton value="Set no limit" on:click={e => handleSubmit(null)} data-testid="RowsLimitModal_setNoLimit" />
      <FormStyledButton type="button" value="Cancel" on:click={closeCurrentModal} data-testid="RowsLimitModal_cancel" />
    </svelte:fragment>
  </ModalBase>
</FormProvider>
