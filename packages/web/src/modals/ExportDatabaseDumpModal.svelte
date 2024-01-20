<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { format as dateFormat } from 'date-fns';

  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import UploadButton from '../buttons/UploadButton.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import { exportSqlDump, importSqlDump } from '../utility/exportFileTools';
  import getElectron from '../utility/getElectron';
  import { setUploadListener } from '../utility/uploadFiles';
  import ChangeDownloadUrlModal from './ChangeDownloadUrlModal.svelte';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal, showModal } from './modalTools';
  import InputTextModal from './InputTextModal.svelte';
  import { apiCall } from '../utility/api';
  import getConnectionLabel from '../utility/getConnectionLabel';

  export let connection;

  let outputLabel;
  let outputFile;
  let pureFileName = null;

  function getDefaultFileName() {
    return `${connection.database}-${dateFormat(new Date(), 'yyyy-MM-dd-HH-mm-ss')}.sql`;
  }

  onMount(async () => {
    const file = getDefaultFileName();
    setFilesFolderResult(file);
  });

  const setFilesFolderResult = async file => {
    const resp = await apiCall('files/get-file-real-path', { folder: 'sql', file });
    if (!resp) return;
    outputLabel = `SQL Files folder: ${file}`;
    outputFile = resp;
    pureFileName = null;
  };

  const handleSubmit = async values => {
    const { value } = values;
    closeCurrentModal();
    exportSqlDump(outputFile, connection, connection.database, pureFileName);
  };

  const electron = getElectron();

  const handleFilesFolder = () => {
    showModal(InputTextModal, {
      value: getDefaultFileName(),
      label: 'New file name',
      header: 'Backup/dump database',

      onConfirm: async file => {
        await tick();
        setFilesFolderResult(file);
      },
    });
  };

  const handleBrowse = async () => {
    const electron = getElectron();
    const file = await electron.showSaveDialog({
      properties: ['showOverwriteConfirmation'],
      filters: [
        { name: 'SQL Files', extensions: ['sql'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      defaultPath: outputFile,
    });
    if (file) {
      const path = window.require('path');
      outputFile = file;
      outputLabel = path.parse(outputFile).name;
      pureFileName = null;
    }
  };

  const handleDownload = async () => {
    const resp = await apiCall('files/generate-uploads-file', { extension: 'sql' });
    outputFile = resp.filePath;
    outputLabel = 'Download';
    pureFileName = resp.fileName;
  };
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header">Export database dump</svelte:fragment>

    <div class="m-3">
      <strong>Source:</strong>
      {getConnectionLabel(connection)}
      {#if connection.database}
        ({connection.database})
      {/if}
    </div>

    <div class="ml-3 mr-3 mt-3"><strong>Target:</strong> {outputLabel}</div>
    <div class="flex ml-3">
      {#if electron}
        <FormStyledButton type="button" value="Browse" on:click={handleBrowse} />
      {:else}
        <FormStyledButton type="button" value="Set download" on:click={handleDownload} />
      {/if}
      <FormStyledButton type="button" value="Files folder" on:click={handleFilesFolder} />
    </div>

    <svelte:fragment slot="footer">
      <FormSubmit value="Run export" on:click={e => handleSubmit(e.detail)} disabled={!outputFile} />
      <FormStyledButton type="button" value="Cancel" on:click={closeCurrentModal} />
    </svelte:fragment>
  </ModalBase>
</FormProvider>
