<script lang="ts">
  import AppFilesList from './AppFilesList.svelte';

  import WidgetColumnBar from './WidgetColumnBar.svelte';
  import WidgetColumnBarItem from './WidgetColumnBarItem.svelte';

  import { useFavorites } from '../utility/metadataLoaders';
  import AppFolderList from './AppFolderList.svelte';
</script>

<WidgetColumnBar>
  <WidgetColumnBarItem title="Applications" name="apps" height="30%" storageName="appsWidget">
    <AppFolderList />
  </WidgetColumnBarItem>

  <WidgetColumnBarItem title="Application files" name="files" storageName="appFilesWidget">
    <AppFilesList />
  </WidgetColumnBarItem>
</WidgetColumnBar>
