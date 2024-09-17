<script lang="ts" context="module">
  function extractUrlName(url, values) {
    const match = url.match(/\/([^/\?]+)($|\?)/);
    if (match) {
      const res = match[1];
      if (res.includes('.')) {
        return res.slice(0, res.indexOf('.'));
      }
      return res;
    }
    return `url${values && values.sourceList ? values.sourceList.length + 1 : '1'}`;
  }
</script>

<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import { getFormContext } from '../forms/FormProviderCore.svelte';
  import ChangeDownloadUrlModal from '../modals/ChangeDownloadUrlModal.svelte';
  import { showModal } from '../modals/modalTools';
  import { extensions } from '../stores';

  import getElectron from '../utility/getElectron';
  import ElectronFilesInput from './ElectronFilesInput.svelte';
  import { addFilesToSourceList } from './ImportExportConfigurator.svelte';
  import UploadButton from '../buttons/UploadButton.svelte';

  export let setPreviewSource = undefined;

  const electron = getElectron();
  const { values } = getFormContext();

  const doAddUrl = url => {
    addFilesToSourceList(
      $extensions,
      [
        {
          fileName: url,
          shortName: extractUrlName(url, $values),
          isDownload: true,
        },
      ],
      $values,
      values,
      null,
      setPreviewSource
    );
  };
  const handleAddUrl = () => showModal(ChangeDownloadUrlModal, { onConfirm: doAddUrl });
</script>

<div class="main">
  <div class="flex">
    {#if electron}
      <ElectronFilesInput />
    {:else}
      <UploadButton />
    {/if}
    <FormStyledButton value="Add web URL" on:click={handleAddUrl} />
  </div>

  <div class="wrapper">Drag &amp; drop imported files here</div>
</div>

<style>
  .wrapper {
    padding: 10px;
    background: var(--theme-bg-2);
  }

  .main {
    margin: var(--dim-large-form-margin);
  }
</style>
