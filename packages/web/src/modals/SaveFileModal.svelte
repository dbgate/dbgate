<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';

  import FormProviderCore from '../forms/FormProviderCore.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FormTextField from '../forms/FormTextField.svelte';
  import { cloudSigninTokenHolder } from '../stores';
  import { _t } from '../translations';
  import { apiCall } from '../utility/api';
  import { writable } from 'svelte/store';

  import getElectron from '../utility/getElectron';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal, showModal } from './modalTools';
  import FormCloudFolderSelect from '../forms/FormCloudFolderSelect.svelte';

  export let data;
  export let name;
  export let folder;
  export let format;
  export let fileExtension;
  export let filePath;
  export let onSave = undefined;
  export let folid;
  export let skipLocal = false;
  // export let cntid;

  const values = writable({ name, cloudFolder: folid ?? '__local' });

  const electron = getElectron();

  const handleSubmit = async e => {
    const { name, cloudFolder } = e.detail;
    if (cloudFolder === '__local') {
      await apiCall('files/save', { folder, file: name, data, format });
      closeCurrentModal();
      if (onSave) {
        onSave(name, {
          savedFile: name,
          savedFolder: folder,
          savedFilePath: null,
          savedCloudFolderId: null,
          savedCloudContentId: null,
        });
      }
    } else {
      const resp = await apiCall('cloud/save-file', {
        folid: cloudFolder,
        fileName: name,
        data,
        contentFolder: folder,
        format,
        // cntid,
      });
      if (resp.cntid) {
        closeCurrentModal();
        if (onSave) {
          onSave(name, {
            savedFile: name,
            savedFolder: folder,
            savedFilePath: null,
            savedCloudFolderId: cloudFolder,
            savedCloudContentId: resp.cntid,
          });
        }
      }
    }
  };

  const handleSaveToDisk = async filePath => {
    const path = window.require('path');
    const parsed = path.parse(filePath);
    // if (!parsed.ext) filePath += `.${fileExtension}`;

    await apiCall('files/save-as', { filePath, data, format });
    closeCurrentModal();

    if (onSave) {
      onSave(parsed.name, {
        savedFile: null,
        savedFolder: null,
        savedFilePath: filePath,
        savedCloudFolderId: null,
        savedCloudContentId: null,
      });
    }
  };
</script>

<FormProviderCore {values}>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header">Save file</svelte:fragment>
    <FormTextField label="File name" name="name" focused />
    {#if $cloudSigninTokenHolder}
      <FormCloudFolderSelect
        label="Choose cloud folder"
        name="cloudFolder"
        isNative
        requiredRoleVariants={['write', 'admin']}
        prependFolders={skipLocal
          ? []
          : [
              {
                folid: '__local',
                name: "Local folder (don't store on cloud)",
              },
            ]}
      />
    {/if}

    <svelte:fragment slot="footer">
      <FormSubmit value={_t('common.save', { defaultMessage: 'Save' })} on:click={handleSubmit} />
      {#if electron}
        <FormStyledButton
          type="button"
          value="Save to disk"
          on:click={async () => {
            const file = await electron.showSaveDialog({
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
</FormProviderCore>
