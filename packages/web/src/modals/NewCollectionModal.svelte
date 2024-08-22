<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import FormArgumentList from '../forms/FormArgumentList.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FormTextField from '../forms/FormTextField.svelte';
  import { apiCall } from '../utility/api';
  import { showSnackbarSuccess } from '../utility/snackbar';
  import ErrorMessageModal from './ErrorMessageModal.svelte';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal, showModal } from './modalTools';

  export let driver;
  export let dbid;

  let isSaving = false;

  const handleSubmit = async values => {
    isSaving = true;
    try {
      const resp = await apiCall('database-connections/run-operation', {
        ...dbid,
        operation: {
          type: 'createCollection',
          collection: values,
        },
      });

      const { errorMessage } = resp || {};
      if (errorMessage) {
        showModal(ErrorMessageModal, { title: 'Error when executing operation', message: errorMessage });
      } else {
        showSnackbarSuccess('Saved to database');
        apiCall('database-connections/sync-model', dbid);
        closeCurrentModal();
      }
    } finally {
      isSaving = false;
    }
  };
</script>

<FormProvider initialValues={{ name: '' }}>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header">
      Create {driver?.collectionSingularLabel ?? 'collection/container'}
    </svelte:fragment>

    <FormArgumentList args={driver?.newCollectionFormParams} />

    <svelte:fragment slot="footer">
      <FormSubmit value="OK" on:click={e => handleSubmit(e.detail)} disabled={isSaving} />
      <FormStyledButton type="button" value="Cancel" on:click={closeCurrentModal} />
    </svelte:fragment>
  </ModalBase>
</FormProvider>
