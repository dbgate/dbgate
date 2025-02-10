<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let message;
  export let onConfirm;
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    {message}

    <svelte:fragment slot="footer">
      <FormSubmit
        value="OK"
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
