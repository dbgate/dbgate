<script lang="ts">
  import { useTeamFolders } from '../utility/metadataLoaders';

  import FormSelectField from './FormSelectField.svelte';

  export let name;
  export let folderFilter = folder => true;

  const teamFolders = useTeamFolders();

  $: folderOptions = [
    ...($teamFolders || [])
      .filter(folder => folderFilter(folder))
      .map(folder => ({
        value: folder.teamFolderId?.toString(),
        label: folder.folder,
      })),
  ];
</script>

<FormSelectField {...$$props} options={folderOptions} />
