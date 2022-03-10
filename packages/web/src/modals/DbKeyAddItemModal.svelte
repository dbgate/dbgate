<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
import DbKeyItemDetail from '../dbkeyvalue/DbKeyItemDetail.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FormTextField from '../forms/FormTextField.svelte';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let keyInfo;
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
      Add item
    </svelte:fragment>

    <DbKeyItemDetail {keyInfo} />

    <svelte:fragment slot="footer">
      <FormSubmit value="OK" on:click={e => handleSubmit(e.detail)} />
      <FormStyledButton type="button" value="Cancel" on:click={closeCurrentModal} />
    </svelte:fragment>
  </ModalBase>
</FormProvider>
