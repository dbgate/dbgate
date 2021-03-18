<script lang="ts" context="module">
  function getFileFilters(extensions, storageType) {
    const res = [];
    const format = findFileFormat(extensions, storageType);
    if (format) res.push({ name: format.name, extensions: [format.extension] });
    res.push({ name: 'All Files', extensions: ['*'] });
    return res;
  }
</script>

<script lang="ts">
  import FormStyledButton from '../elements/FormStyledButton.svelte';
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import { getFormContext } from '../forms/FormProviderCore.svelte';
  import { findFileFormat } from '../plugins/fileformats';
  import { extensions } from '../stores';
  import getElectron from '../utility/getElectron';
  import { addFilesToSourceList } from './ImportExportConfigurator.svelte';

  let isLoading = false;

  const electron = getElectron();
  const { values } = getFormContext();

  const handleClick = async () => {
    const files = electron.remote.dialog.showOpenDialogSync(electron.remote.getCurrentWindow(), {
      properties: ['openFile', 'multiSelections'],
      filters: getFileFilters($extensions, $values.sourceStorageType),
    });
    if (files) {
      const path = window.require('path');
      try {
        isLoading = true;
        await addFilesToSourceList(
          $extensions,
          files.map(full => ({
            fileName: full,
            shortName: path.parse(full).name,
          })),
          $values,
          values
        );
      } finally {
        isLoading = false;
      }
    }
  };
</script>

<FormStyledButton type="button" value="Add file(s)" on:click={handleClick} />
{#if isLoading}
  <LoadingInfo message="Anaysing input files" />
{/if}
