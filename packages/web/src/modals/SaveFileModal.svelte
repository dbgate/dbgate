<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';

  import FormProviderCore from '../forms/FormProviderCore.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FormTextField from '../forms/FormTextField.svelte';
  import { cloudSigninTokenHolder, getCurrentConfig } from '../stores';
  import { _t } from '../translations';
  import { apiCall } from '../utility/api';
  import { writable } from 'svelte/store';

  import getElectron from '../utility/getElectron';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal, showModal } from './modalTools';
  import FormCloudFolderSelect from '../forms/FormCloudFolderSelect.svelte';
  import FormCheckboxField from '../forms/FormCheckboxField.svelte';
  import { useConfig, useTeamFolders } from '../utility/metadataLoaders';
  import { showSnackbarError } from '../utility/snackbar';
  import FormTeamFolderSelect from '../forms/FormTeamFolderSelect.svelte';

  export let data;
  export let name;
  export let folder;
  export let format;
  export let fileExtension;
  export let filePath;
  export let onSave = undefined;
  export let folid;
  export let skipLocal = false;
  export let defaultTeamFolder = false;
  // export let cntid;

  const teamFolders = useTeamFolders();
  $: enabledTeamFolders = ($teamFolders || []).some(folder => folder.allowCreate || folder.allowWrite);

  const configValue = useConfig();

  const values = writable({
    name,
    cloudFolder: folid ?? '__local',
    saveToTeamFolder: !!(getCurrentConfig()?.storageDatabase && defaultTeamFolder),
    teamFolderId: '-1',
  });

  const electron = getElectron();

  const handleSubmit = async e => {
    const { name, cloudFolder, teamFolderId, saveToTeamFolder } = e.detail;
    if (saveToTeamFolder && enabledTeamFolders) {
      const resp = await apiCall('team-files/create-new', { fileType: folder, file: name, data, teamFolderId });
      if (resp?.apiErrorMessage) {
        showSnackbarError(resp.apiErrorMessage);
      } else if (resp?.teamFileId) {
        closeCurrentModal();
        if (onSave) {
          onSave(name, {
            savedFile: name,
            savedFolder: folder,
            savedFilePath: null,
            savedCloudFolderId: null,
            savedCloudContentId: null,
            savedTeamFileId: resp.teamFileId,
          });
        }
      } else {
        showSnackbarError('Failed to save to team folder.');
      }
    } else if (cloudFolder === '__local') {
      await apiCall('files/save', { folder, file: name, data, format });
      closeCurrentModal();
      if (onSave) {
        onSave(name, {
          savedFile: name,
          savedFolder: folder,
          savedFilePath: null,
          savedCloudFolderId: null,
          savedCloudContentId: null,
          savedTeamFileId: null,
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
            savedTeamFileId: null,
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
        savedTeamFileId: null,
      });
    }
  };
</script>

<FormProviderCore {values}>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header">Save file</svelte:fragment>
    <FormTextField label="File name" name="name" focused />
    {#if $cloudSigninTokenHolder && !($values['saveToTeamFolder'] && enabledTeamFolders)}
      <FormCloudFolderSelect
        label={_t('cloud.chooseCloudFolder', { defaultMessage: 'Choose cloud folder' })}
        name="cloudFolder"
        isNative
        requiredRoleVariants={['write', 'admin']}
        prependFolders={skipLocal
          ? []
          : [
              {
                folid: '__local',
                name: _t('cloud.localFolder', { defaultMessage: "Local folder (don't store on cloud)" }),
              },
            ]}
      />
    {/if}
    {#if $configValue?.storageDatabase && enabledTeamFolders}
      <FormCheckboxField
        label={_t('cloud.saveToTeamFolder', { defaultMessage: 'Save to team folder' })}
        name="saveToTeamFolder"
      />
      {#if $values.saveToTeamFolder}
        <FormTeamFolderSelect
          isNative
          label={_t('cloud.chooseTeamFolder', { defaultMessage: 'Choose team folder' })}
          name="teamFolderId"
          folderFilter={folder => folder.allowCreate || folder.allowWrite}
        />
      {/if}
    {/if}

    <svelte:fragment slot="footer">
      <FormSubmit value={_t('common.save', { defaultMessage: 'Save' })} on:click={handleSubmit} />
      {#if electron}
        <FormStyledButton
          type="button"
          value={_t('common.saveToDisk', { defaultMessage: 'Save to disk' })}
          on:click={async () => {
            const file = await electron.showSaveDialog({
              filters: [
                {
                  name: _t('common.fileType', {
                    defaultMessage: '{extension} files',
                    values: { extension: fileExtension.toUpperCase() },
                  }),
                  extensions: [fileExtension],
                },
                { name: _t('common.allFiles', { defaultMessage: 'All files' }), extensions: ['*'] },
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
