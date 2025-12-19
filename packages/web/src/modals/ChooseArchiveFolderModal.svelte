<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import FormArchiveFolderSelect from '../forms/FormArchiveFolderSelect.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';
  import { _t } from '../translations';

  export let message = '';
  export let onConfirm;
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header">{_t('archiveFolderModal.chooseArchiveFolder', { defaultMessage: 'Choose archive folder' })}</svelte:fragment>

    <div>{message}</div>

    <FormArchiveFolderSelect label={_t('archiveFolderModal.archiveFolder', { defaultMessage: 'Archive folder' })} name="archiveFolder" isNative allowCreateNew />

    <svelte:fragment slot="footer">
      <FormSubmit
        value={_t('common.ok', { defaultMessage: 'OK' })}
        on:click={e => {
          closeCurrentModal();
          onConfirm(e.detail.archiveFolder);
        }}
      />
      <FormStyledButton type="button" value={_t('common.close', { defaultMessage: 'Close' })} on:click={closeCurrentModal} />
    </svelte:fragment>
  </ModalBase>
</FormProvider>
