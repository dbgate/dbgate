<script lang="ts">
  import getElectron from '../utility/getElectron';

  import InlineButton from '../buttons/InlineButton.svelte';

  import { getFormContext } from './FormProviderCore.svelte';
  import TextField from './TextField.svelte';

  export let name;
  export let disabled = false;
  export let defaultFileName = '';
  export let dialogProperties = undefined;
  export let isSaveDialog = false;
  export let dialogFilters = [{ name: 'All Files', extensions: ['*'] }];

  const { values, setFieldValue } = getFormContext();

  async function handleBrowse() {
    const electron = getElectron();
    if (!electron) return;

    if (isSaveDialog) {
      const filePath = await electron.showSaveDialog({
        defaultPath: values[name],
        properties: dialogProperties ?? ['showHiddenFiles', 'showOverwriteConfirmation'],
        filters: dialogFilters,
      });
      if (filePath) setFieldValue(name, filePath);
    } else {
      const filePaths = await electron.showOpenDialog({
        defaultPath: values[name],
        properties: dialogProperties ?? ['showHiddenFiles', 'openFile'],
        filters: dialogFilters,
      });
      const filePath = filePaths && filePaths[0];
      if (filePath) setFieldValue(name, filePath);
    }
  }
</script>

<div class="flex">
  <TextField {...$$restProps} value={$values[name] || defaultFileName} on:click={handleBrowse} readOnly {disabled} />
  <InlineButton on:click={handleBrowse} {disabled}>Browse</InlineButton>
</div>
