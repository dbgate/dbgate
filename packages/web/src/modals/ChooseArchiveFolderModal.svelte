<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import FormArchiveFolderSelect from '../forms/FormArchiveFolderSelect.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let message = '';
  export let onConfirm;
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header">Choose archive folder</svelte:fragment>

    <div>{message}</div>

    <FormArchiveFolderSelect label="Archive folder" name="archiveFolder" isNative />

    <svelte:fragment slot="footer">
      <FormSubmit
        value="OK"
        on:click={e => {
          closeCurrentModal();
          onConfirm(e.detail.archiveFolder);
        }}
      />
      <FormStyledButton type="button" value="Close" on:click={closeCurrentModal} />
    </svelte:fragment>
  </ModalBase>
</FormProvider>
