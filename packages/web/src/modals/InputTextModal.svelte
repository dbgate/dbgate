<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FormTextField from '../forms/FormTextField.svelte';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let header;
  export let value;
  export let label;
  export let onConfirm;

  const handleSubmit = async values => {
    const { value } = values;
    closeCurrentModal();
    onConfirm(value);
  };
</script>

<FormProvider initialValues={{ value }}>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header">
      {header}
    </svelte:fragment>

    <FormTextField {label} name="value" focused data-testid="InputTextModal_value" />

    <svelte:fragment slot="footer">
      <FormSubmit value="OK" on:click={e => handleSubmit(e.detail)} data-testid="InputTextModal_ok" />
      <FormStyledButton type="button" value="Cancel" on:click={closeCurrentModal} data-testid="InputTextModal_cancel" />
    </svelte:fragment>
  </ModalBase>
</FormProvider>
