<script lang="ts">
  import getElectron from '../utility/getElectron';

  import InlineButton from '../elements/InlineButton.svelte';

  import { getFormContext } from './FormProviderCore.svelte';
  import TextField from './TextField.svelte';

  export let name;
  export let disabled = false;

  const { values, setFieldValue } = getFormContext();

  function handleBrowse() {
    const electron = getElectron();
    if (!electron) return;
    const filePaths = electron.remote.dialog.showOpenDialogSync(electron.remote.getCurrentWindow(), {
      defaultPath: values[name],
      properties: ['showHiddenFiles'],
    });
    const filePath = filePaths && filePaths[0];
    if (filePath) setFieldValue(name, filePath);
  }
</script>

<div class="flex">
  <TextField {...$$restProps} value={$values[name]} onClick={handleBrowse} readOnly {disabled} />
  <InlineButton on:click={handleBrowse} {disabled}>Browse</InlineButton>
</div>
