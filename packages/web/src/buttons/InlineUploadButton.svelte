<script lang="ts">
  import _ from 'lodash';
  import InlineButton from '../buttons/InlineButton.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import getElectron from '../utility/getElectron';
  import InlineButtonLabel from '../buttons/InlineButtonLabel.svelte';
  import resolveApi, { resolveApiHeaders } from '../utility/resolveApi';

  import uuidv1 from 'uuid/v1';

  export let filters;
  export let onProcessFile;
  export let icon = 'icon plus-thick';

  const inputId = `uploadFileButton-${uuidv1()}`;

  const electron = getElectron();

  async function handleUploadedFile(e) {
    const files = [...e.target.files];

    for (const file of files) {
      const formData = new FormData();
      formData.append('name', file.name);
      formData.append('data', file);

      const fetchOptions = {
        method: 'POST',
        body: formData,
        headers: resolveApiHeaders(),
      };

      const apiBase = resolveApi();
      const resp = await fetch(`${apiBase}/uploads/upload`, fetchOptions);
      const { filePath, originalName } = await resp.json();
      await onProcessFile(filePath, originalName);
    }
  }

  async function handleOpenElectronFile() {
    const filePaths = await electron.showOpenDialog({
      filters,
      properties: ['showHiddenFiles', 'openFile'],
    });
    const filePath = filePaths && filePaths[0];
    if (!filePath) return;
    onProcessFile(filePath, filePath.split(/[\/\\]/).pop());
  }
</script>

{#if electron}
  <InlineButton on:click={handleOpenElectronFile} title="Open file" data-testid={$$props['data-testid']}>
    <FontIcon {icon} />
  </InlineButton>
{:else}
  <InlineButtonLabel on:click={() => {}} title="Upload file" data-testid={$$props['data-testid']} htmlFor={inputId}>
    <FontIcon {icon} />
  </InlineButtonLabel>
{/if}

<input type="file" id={inputId} hidden on:change={handleUploadedFile} />
