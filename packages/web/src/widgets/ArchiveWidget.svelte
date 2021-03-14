<script lang="ts">
  import ArchiveFilesList from './ArchiveFilesList.svelte';

  import ArchiveFolderList from './ArchiveFolderList.svelte';

  import WidgetColumnBar from './WidgetColumnBar.svelte';
  import WidgetColumnBarItem from './WidgetColumnBarItem.svelte';
</script>

<WidgetColumnBar>
  <WidgetColumnBarItem title="Archive folders" name="folders" height="50%">
    <ArchiveFolderList />
  </WidgetColumnBarItem>
  <WidgetColumnBarItem title="Archive files" name="files">
    <ArchiveFilesList />
  </WidgetColumnBarItem>
</WidgetColumnBar>
