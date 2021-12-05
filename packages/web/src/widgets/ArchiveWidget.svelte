<script lang="ts">
  import ArchiveFilesList from './ArchiveFilesList.svelte';

  import ArchiveFolderList from './ArchiveFolderList.svelte';

  import WidgetColumnBar from './WidgetColumnBar.svelte';
  import WidgetColumnBarItem from './WidgetColumnBarItem.svelte';
</script>

<WidgetColumnBar>
  <WidgetColumnBarItem title="Archive folders, DB models" name="folders" height="50%" storageName='archiveFoldersWidget'>
    <ArchiveFolderList />
  </WidgetColumnBarItem>
  <WidgetColumnBarItem title="Files, Tables, Views, Functions" name="files" storageName='archiveFilesWidget'>
    <ArchiveFilesList />
  </WidgetColumnBarItem>
</WidgetColumnBar>
