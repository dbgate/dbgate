<script lang="ts">
  import SavedFilesList from './SavedFilesList.svelte';

  import WidgetColumnBar from './WidgetColumnBar.svelte';
  import WidgetColumnBarItem from './WidgetColumnBarItem.svelte';

  import AppObjectList from '../appobj/AppObjectList.svelte';
  import * as cloudFileAppObject from '../appobj/CloudFileAppObject.svelte';
  import { usePublicCloudFiles } from '../utility/metadataLoaders';
  import { _t } from '../translations';

  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';

  $: publicFiles = usePublicCloudFiles();
</script>

<WidgetColumnBar>
  <WidgetColumnBarItem title="Public cloud" name="cloud" height="70%" storageName="publicCloudItems">
    <WidgetsInnerContainer>
      <AppObjectList list={$publicFiles || []} module={cloudFileAppObject} groupFunc={data => data.folder} />
    </WidgetsInnerContainer>
  </WidgetColumnBarItem>

  <WidgetColumnBarItem title="Favorites" name="favorites" storageName="favoritesWidget"></WidgetColumnBarItem>
</WidgetColumnBar>
