<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import FormArgumentList from '../forms/FormArgumentList.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FormTextField from '../forms/FormTextField.svelte';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let onConfirm;
  export let driver;

  const handleSubmit = async values => {
    closeCurrentModal();
    onConfirm(values);
  };
</script>

<FormProvider initialValues={{ name: '' }}>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header">
      Create {driver?.collectionSingularLabel ?? 'collection/container'}
    </svelte:fragment>

    <FormArgumentList args={driver?.newCollectionFormParams} />

    <svelte:fragment slot="footer">
      <FormSubmit value="OK" on:click={e => handleSubmit(e.detail)} />
      <FormStyledButton type="button" value="Cancel" on:click={closeCurrentModal} />
    </svelte:fragment>
  </ModalBase>
</FormProvider>
