<script lang="ts">
  import { useCloudContentList } from '../utility/metadataLoaders';

  import FormSelectField from './FormSelectField.svelte';

  export let name;
  export let requiredRoleVariants = ['read', 'write', 'admin'];

  export let prependFolders = [];

  const cloudContentList = useCloudContentList();

  $: folderOptions = [
    ...prependFolders.map(folder => ({
      value: folder.folid,
      label: folder.name,
    })),
    ...($cloudContentList || [])
      .filter(folder => requiredRoleVariants.find(role => folder.role == role))
      .map(folder => ({
        value: folder.folid,
        label: folder.name,
      })),
  ];
</script>

<FormSelectField {...$$props} options={folderOptions} />
