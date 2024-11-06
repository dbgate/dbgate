<script lang="ts">
  import InputTextModal from '../modals/InputTextModal.svelte';

  import { showModal } from '../modals/modalTools';
  import { apiCall } from '../utility/api';

  import { useArchiveFolders } from '../utility/metadataLoaders';
  import { getFormContext } from './FormProviderCore.svelte';

  import FormSelectField from './FormSelectField.svelte';

  export let additionalFolders = [];
  export let name;

  const { setFieldValue } = getFormContext();

  const folders = useArchiveFolders();

  $: folderOptions = [
    ...($folders || []).map(folder => ({
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
    {
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
        label: 'Name of new folder',
        onConfirm: createOption,
      });
    }
  }
</script>

<FormSelectField {...$$props} options={folderOptions} on:change={handleChange} />
