<script lang="ts">
  import { onMount, tick } from 'svelte';

  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import UploadButton from '../buttons/UploadButton.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
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

  const handleAddUrl = () => {
    showModal(ChangeDownloadUrlModal, {
      onConfirm: async url => {
        await tick();
        inputLabel = url;
        inputFile = url;
      },
    });
  };

  const handleBrowse = async () => {
    const electron = getElectron();
    const files = await electron.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'SQL Files', extensions: ['*.sql'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (files && files[0]) {
      const path = window.require('path');
      inputFile = files[0];
      inputLabel = path.parse(inputFile).name;
    }
  };
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header">Import database dump</svelte:fragment>

    <div class="m-3">Source: {inputLabel}</div>

    <div class="flex">
      {#if electron}
        <FormStyledButton type="button" value="Browse" on:click={handleBrowse} />
      {:else}
        <UploadButton />
      {/if}

      <FormStyledButton value="Add web URL" on:click={handleAddUrl} />
    </div>

    <svelte:fragment slot="footer">
      <FormSubmit value="Run import" on:click={e => handleSubmit(e.detail)} disabled={!inputFile} />
      <FormStyledButton type="button" value="Cancel" on:click={closeCurrentModal} />
    </svelte:fragment>
  </ModalBase>
</FormProvider>
