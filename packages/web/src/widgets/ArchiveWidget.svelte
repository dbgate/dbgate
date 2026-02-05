<script lang="ts">
  import ArchiveFilesList from './ArchiveFilesList.svelte';

  import ArchiveFolderList from './ArchiveFolderList.svelte';

  import WidgetColumnBar from './WidgetColumnBar.svelte';
  import WidgetColumnBarItem from './WidgetColumnBarItem.svelte';
  import { _t } from '../translations';  
</script>

<WidgetColumnBar storageName="archiveWidget">
  <WidgetColumnBarItem title={_t('archiveWidget.folders', { defaultMessage: 'Archive folders, DB models' })} name="folders" height="50%">
    <ArchiveFolderList />
  </WidgetColumnBarItem>
  <WidgetColumnBarItem title={_t('archiveWidget.files', { defaultMessage: 'Files, Tables, Views, Functions' })} name="files">
    <ArchiveFilesList />
  </WidgetColumnBarItem>
</WidgetColumnBar>
