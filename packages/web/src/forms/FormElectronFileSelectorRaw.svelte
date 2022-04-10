<script lang="ts">
  import getElectron from '../utility/getElectron';

  import InlineButton from '../buttons/InlineButton.svelte';

  import { getFormContext } from './FormProviderCore.svelte';
  import TextField from './TextField.svelte';

  export let name;
  export let disabled = false;

  const { values, setFieldValue } = getFormContext();

  async function handleBrowse() {
    const electron = getElectron();
    if (!electron) return;
    const filePaths = await electron.showOpenDialog({
      defaultPath: values[name],
      properties: ['showHiddenFiles', 'openFile'],
      filters: [{ name: 'All Files', extensions: ['*'] }],
    });
    const filePath = filePaths && filePaths[0];
    if (filePath) setFieldValue(name, filePath);
  }
</script>

<div class="flex">
  <TextField {...$$restProps} value={$values[name]} on:click={handleBrowse} readOnly {disabled} />
  <InlineButton on:click={handleBrowse} {disabled}>Browse</InlineButton>
</div>
