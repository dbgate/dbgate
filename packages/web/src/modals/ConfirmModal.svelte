<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let message;
  export let onConfirm;
  export let confirmLabel = 'OK';
  export let header = null;
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header">
      {header || 'Confirm'}
    </svelte:fragment>

    {message}

    <svelte:fragment slot="footer">
      <FormSubmit
        value={confirmLabel}
        on:click={() => {
          closeCurrentModal();
          onConfirm();
        }}
        data-testid="ConfirmModal_okButton"
      />
      <FormStyledButton
        type="button"
        value="Close"
        on:click={closeCurrentModal}
        data-testid="ConfirmModal_closeButton"
      />
    </svelte:fragment>
  </ModalBase>
</FormProvider>
