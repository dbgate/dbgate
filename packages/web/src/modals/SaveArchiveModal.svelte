<script lang="ts">
  import FormArchiveFolderSelect from '../forms/FormArchiveFolderSelect.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import FormSelectField from '../forms/FormSelectField.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FormTextField from '../forms/FormTextField.svelte';
  import { currentArchive } from '../stores';
  import { _t } from '../translations';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let file = 'new-table';
  export let folder = $currentArchive;
  export let onSave;

  const handleSubmit = async e => {
    const { file, folder } = e.detail;
    closeCurrentModal();
    if (onSave) onSave(folder, file);
  };
</script>

<FormProvider initialValues={{ file, folder }}>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header">Save to archive</svelte:fragment>

    <FormArchiveFolderSelect label="Folder" name="folder" isNative />
    <FormTextField label="File name" name="file" />

    <svelte:fragment slot="footer">
      <FormSubmit value={_t('common.save', { defaultMessage: 'Save' })} on:click={handleSubmit} />
    </svelte:fragment>
  </ModalBase>
</FormProvider>
