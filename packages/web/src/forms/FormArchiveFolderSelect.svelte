<script lang="ts">
  import InputTextModal from '../modals/InputTextModal.svelte';

  import { showModal } from '../modals/modalTools';
  import { apiCall } from '../utility/api';

  import { useArchiveFolders } from '../utility/metadataLoaders';
  import { getFormContext } from './FormProviderCore.svelte';

  import FormSelectField from './FormSelectField.svelte';

  export let additionalFolders = [];
  export let name;
  export let allowCreateNew = false;
  export let zipFilesOnly = false;
  export let skipZipFiles = false;

  const { setFieldValue } = getFormContext();

  const folders = useArchiveFolders();

  $: folderOptions = [
    ...($folders || [])
      .filter(folder => (zipFilesOnly ? folder.name.endsWith('.zip') : true))
      .filter(folder => (skipZipFiles ? !folder.name.endsWith('.zip') : true))
      .map(folder => ({
        value: folder.name,
        label: folder.name,
      })),
    ...additionalFolders
      .filter(x => x != '@create')
      .filter(x => !($folders || []).find(y => y.name == x))
      .map(folder => ({
        value: folder,
        label: folder,
      })),
    allowCreateNew && {
      label: '(Create new)',
      value: '@create',
    },
  ];

  const createOption = folder => {
    apiCall('archive/create-folder', { folder });
    setFieldValue(name, folder);
  };

  function handleChange(e) {
    if (e.detail == '@create') {
      showModal(InputTextModal, {
        header: 'Archive',
        label: 'Name of new archive folder',
        onConfirm: createOption,
      });
    }
  }
</script>

<FormSelectField {...$$props} options={folderOptions} on:change={handleChange} />
