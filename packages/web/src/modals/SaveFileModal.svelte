<script lang="ts">
  import FormStyledButton from '../elements/FormStyledButton.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FormTextField from '../forms/FormTextField.svelte';

  import axiosInstance from '../utility/axiosInstance';
  import getElectron from '../utility/getElectron';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let data;
  export let name;
  export let folder;
  export let format;
  export let fileExtension;
  export let filePath;
  export let onSave = undefined;

  const electron = getElectron();

  const handleSubmit = async e => {
    const { name } = e.detail;
    await axiosInstance().post('files/save', { folder, file: name, data, format });
    closeCurrentModal();
    if (onSave) {
      onSave(name, {
        savedFile: name,
        savedFolder: folder,
        savedFilePath: null,
      });
    }
  };

  const handleSaveToDisk = async filePath => {
    const path = window.require('path');
    const parsed = path.parse(filePath);
    // if (!parsed.ext) filePath += `.${fileExtension}`;

    await axiosInstance().post('files/save-as', { filePath, data, format });
    closeCurrentModal();

    if (onSave) {
      onSave(parsed.name, {
        savedFile: null,
        savedFolder: null,
        savedFilePath: filePath,
      });
    }
  };
</script>

<FormProvider initialValues={{ name }}>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header">Save file</svelte:fragment>
    <FormTextField label="File name" name="name" focused />
    <svelte:fragment slot="footer">
      <FormSubmit value="Save" on:click={handleSubmit} />
      {#if electron}
        <FormStyledButton
          type="button"
          value="Save to disk"
          on:click={() => {
            const file = electron.remote.dialog.showSaveDialogSync(electron.remote.getCurrentWindow(), {
              filters: [
                { name: `${fileExtension.toUpperCase()} files`, extensions: [fileExtension] },
                { name: `All files`, extensions: ['*'] },
              ],
              defaultPath: filePath || `${name}.${fileExtension}`,
              properties: ['showOverwriteConfirmation'],
            });
            if (file) {
              handleSaveToDisk(file);
            }
          }}
        />
      {/if}
    </svelte:fragment>
  </ModalBase>
</FormProvider>
