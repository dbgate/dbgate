<script lang="ts">
  import { onMount } from 'svelte';

  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import UploadButton from '../buttons/UploadButton.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FormTextField from '../forms/FormTextField.svelte';
  import ElectronFilesInput from '../impexp/ElectronFilesInput.svelte';
  import { importSqlDump } from '../utility/exportFileTools';
  import getElectron from '../utility/getElectron';
  import { setUploadListener } from '../utility/uploadFiles';
  import ChangeDownloadUrlModal from './ChangeDownloadUrlModal.svelte';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal, showModal } from './modalTools';

  export let connection;

  let inputLabel = '(not selected)';
  let inputFile = null;

  const handleSubmit = async values => {
    const { value } = values;
    closeCurrentModal();
    // onConfirm(value);
    importSqlDump(inputFile, connection);
  };

  const electron = getElectron();

  const handleUpload = file => {
    inputLabel = `uploaded: ${file.shortName}`;
    inputFile = file.filePath;
  };

  onMount(() => {
    setUploadListener(handleUpload);

    return () => {
      setUploadListener(null);
    };
  });

  const handleAddUrl = () =>
    showModal(ChangeDownloadUrlModal, {
      onConfirm: url => {
        inputLabel = url;
        inputFile = url;
      },
    });
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header">Import database dump</svelte:fragment>

    <div class="m-3">Source: {inputLabel}</div>
    {#if electron}
      <ElectronFilesInput />
    {:else}
      <UploadButton />
    {/if}

    <FormStyledButton value="Add web URL" on:click={handleAddUrl} />

    <svelte:fragment slot="footer">
      <FormSubmit value="OK" on:click={e => handleSubmit(e.detail)} />
      <FormStyledButton type="button" value="Cancel" on:click={closeCurrentModal} />
    </svelte:fragment>
  </ModalBase>
</FormProvider>
